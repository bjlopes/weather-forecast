import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (compatible; WeatherForecast/1.0)",
];

export function isUsableAlertaHtml(html: string | null | undefined): html is string {
  if (!html) return false;
  if (html.includes("Request Rejected")) return false;
  if (html.length < 400) return false;
  return /<tr\b/i.test(html);
}

async function curlAlertaHtml(url: string, referer: string): Promise<string | null> {
  const dir = await mkdtemp(join(tmpdir(), "alerta-html-"));
  const bodyPath = join(dir, "body.html");
  try {
    for (const agent of AGENTS) {
      try {
        const { stdout: code } = await execFileAsync(
          "/usr/bin/curl",
          [
            "-sS",
            "-L",
            "--max-time",
            "18",
            "-A",
            agent,
            "-H",
            "Accept: text/html,application/xhtml+xml",
            "-H",
            "Accept-Language: pt-BR,pt;q=0.9",
            "-H",
            `Referer: ${referer}`,
            "-o",
            bodyPath,
            "-w",
            "%{http_code}",
            url,
          ],
          { timeout: 22_000, encoding: "utf8" },
        );
        if (String(code).trim() !== "200") continue;
        const html = await readFile(bodyPath, "utf8");
        if (isUsableAlertaHtml(html)) return html;
      } catch {
        // próximo agent
      }
    }
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function nodeFetchAlertaHtml(
  url: string,
  referer: string,
): Promise<string | null> {
  for (const agent of AGENTS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
        redirect: "follow",
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "pt-BR,pt;q=0.9",
          Referer: referer,
          "User-Agent": agent,
        },
      });
      if (!res.ok) continue;
      const html = await res.text();
      if (isUsableAlertaHtml(html)) return html;
    } catch {
      // próximo agent
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

/**
 * Prefer curl — o WAF municipal bloqueia o fingerprint TLS do Node (mesmo padrão do radar).
 * Mantém fetch Node como fallback (TempoReal às vezes libera).
 */
export async function fetchAlertaHtml(
  url: string,
  referer: string,
): Promise<string | null> {
  const viaCurl = await curlAlertaHtml(url, referer);
  if (viaCurl) return viaCurl;
  return nodeFetchAlertaHtml(url, referer);
}
