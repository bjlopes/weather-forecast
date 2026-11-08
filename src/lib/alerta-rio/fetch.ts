import { parseAlertaRioHtml } from "./parse";
import { SAMPLE_SNAPSHOT } from "./sample";
import type { AlertaRioSnapshot } from "./types";

const CANDIDATE_URLS = [
  "http://alertario.rio.rj.gov.br/upload/TempoReal.html",
  "https://alertario.rio.rj.gov.br/upload/TempoReal.html",
  "https://websempre.rio.rj.gov.br/estacoes/",
];

async function tryFetch(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9",
        "User-Agent": "Mozilla/5.0 (compatible; WeatherForecast/1.0)",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (html.includes("Request Rejected") || html.length < 500) return null;
    return html;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function getAlertaRioSnapshot(): Promise<AlertaRioSnapshot> {
  for (const url of CANDIDATE_URLS) {
    const html = await tryFetch(url);
    if (!html) continue;
    try {
      return parseAlertaRioHtml(html, url);
    } catch {
      // next
    }
  }
  return { ...SAMPLE_SNAPSHOT, fetchedAt: new Date().toISOString(), source: "sample" };
}
