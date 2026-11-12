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

/** Conteúdo bruto do Alerta Rio (HTML de tabela ou markdown espelhado). */
export function isUsableAlertaHtml(html: string | null | undefined): html is string {
  if (!html) return false;
  if (html.includes("Request Rejected")) return false;
  if (/bot verification|lsrecaptcha/i.test(html)) return false;
  if (html.length < 400) return false;
  if (/<tr\b/i.test(html)) return true;
  // Jina / leitores às vezes devolvem markdown com a tabela do boletim.
  return (
    /m[aá]x\.?\s*:?\s*\d{1,2}/i.test(html) &&
    /madrugada|manh[ãa]|tarde|noite/i.test(html)
  );
}

/** Converte tabelas markdown (| a | b |) em <tr><td> para os parsers existentes. */
export function markdownTablesToHtml(text: string): string {
  if (/<tr\b/i.test(text)) return text;
  const lines = text.split(/\r?\n/);
  const out: string[] = ["<table>"];
  let inTable = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.includes("|", 1)) {
      if (inTable) {
        out.push("</table><table>");
        inTable = false;
      }
      continue;
    }
    // Separador | --- | --- |
    if (/^\|[\s|:.-]+\|$/.test(trimmed)) continue;
    const cells = trimmed
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());
    if (!cells.length) continue;
    inTable = true;
    out.push(`<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`);
  }
  out.push("</table>");
  return out.join("\n");
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
async function jinaFetchAlertaHtml(
  url: string,
  format: "html" | "markdown",
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const bust = `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
    const res = await fetch(`https://r.jina.ai/${bust}`, {
      signal: controller.signal,
      cache: "no-store",
      redirect: "follow",
      headers: {
        Accept: format === "markdown" ? "text/markdown,text/plain" : "text/html,application/xhtml+xml",
        "User-Agent": USER_AGENT,
        "X-Return-Format": format,
        "X-Timeout": "15",
        Referer: DEFAULT_REFERER,
      },
    });
    if (!res.ok) return null;
    const body = await res.text();
    if (!isUsableAlertaHtml(body)) return null;
    return format === "markdown" ? markdownTablesToHtml(body) : body;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Node direto → curl → proxy Jina (HTML, depois markdown).
 * TempoReal costuma passar no Node; Estendida/Previsão oscilam e caem no Jina.
 */
export async function fetchAlertaHtml(url: string): Promise<string | null> {
  const viaNode = await nodeFetchAlertaHtml(url);
  if (viaNode) return viaNode;
  const viaCurl = await curlAlertaHtml(url);
  if (viaCurl) return viaCurl;
  const viaJinaHtml = await jinaFetchAlertaHtml(url, "html");
  if (viaJinaHtml) return viaJinaHtml;
  return jinaFetchAlertaHtml(url, "markdown");
}
