import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** UA de browser — o WAF municipal costuma rejeitar bots curtos. */
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const DEFAULT_REFERER = "https://alertario.rio.rj.gov.br/24-horas/";

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
        "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "-H",
        "Accept-Language: pt-BR,pt;q=0.9",
        "-H",
        `Referer: ${DEFAULT_REFERER}`,
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
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9",
        "User-Agent": USER_AGENT,
        Referer: DEFAULT_REFERER,
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
 * Quando o WAF municipal bloqueia o IP da Vercel, o Jina Reader ainda consegue
 * espelhar alguns uploads (ex.: Estendida) e devolver HTML bruto.
 */
async function jinaFetchAlertaHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      signal: controller.signal,
      cache: "no-store",
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": USER_AGENT,
        "X-Return-Format": "html",
        Referer: DEFAULT_REFERER,
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
 * Node direto → curl → proxy Jina (HTML).
 * TempoReal costuma passar no Node; Estendida oscila e cai no Jina.
 */
export async function fetchAlertaHtml(url: string): Promise<string | null> {
  const viaNode = await nodeFetchAlertaHtml(url);
  if (viaNode) return viaNode;
  const viaCurl = await curlAlertaHtml(url);
  if (viaCurl) return viaCurl;
  return jinaFetchAlertaHtml(url);
}
