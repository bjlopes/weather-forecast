import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Mesmo UA do TempoReal — no Vercel o Node fetch passa sem Referer. */
const USER_AGENT = "Mozilla/5.0 (compatible; WeatherForecast/1.0)";

export function isUsableAlertaHtml(html: string | null | undefined): html is string {
  if (!html) return false;
  if (html.includes("Request Rejected")) return false;
  if (/bot verification|lsrecaptcha/i.test(html)) return false;
  if (html.length < 400) return false;
  return /<tr\b/i.test(html);
}

async function curlAlertaHtml(url: string): Promise<string | null> {
  const dir = await mkdtemp(join(tmpdir(), "alerta-html-"));
  const bodyPath = join(dir, "body.html");
  try {
    const { stdout: code } = await execFileAsync(
      "/usr/bin/curl",
      [
        "-sS",
        "-L",
        "--max-time",
        "8",
        "-A",
        USER_AGENT,
        "-H",
        "Accept: text/html,application/xhtml+xml",
        "-H",
        "Accept-Language: pt-BR,pt;q=0.9",
        "-o",
        bodyPath,
        "-w",
        "%{http_code}",
        url,
      ],
      { timeout: 10_000, encoding: "utf8" },
    );
    if (String(code).trim() !== "200") return null;
    const html = await readFile(bodyPath, "utf8");
    return isUsableAlertaHtml(html) ? html : null;
  } catch {
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function nodeFetchAlertaHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    // Sem Referer: o WAF do Alerta Rio rejeita vários uploads quando o header vem setado.
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9",
        "User-Agent": USER_AGENT,
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    return isUsableAlertaHtml(html) ? html : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Node fetch primeiro, espelhando TempoReal (sem Referer).
 * Curl só como backup curto.
 */
export async function fetchAlertaHtml(
  url: string,
  _referer?: string,
): Promise<string | null> {
  const viaNode = await nodeFetchAlertaHtml(url);
  if (viaNode) return viaNode;
  return curlAlertaHtml(url);
}
