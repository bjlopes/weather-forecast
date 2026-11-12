import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fetchAlertaHtml } from "./alerta-html-fetch";
import {
  type AlertaRioDayForecast,
  parsePrevisaoEstendidaHtml,
  PREVISAO_ESTENDIDA_URL,
} from "./estendida-parse";

async function loadCachedEstendidaHtml(): Promise<string | null> {
  const candidates = [
    join(process.cwd(), "src/lib/alerta-rio/previsao-estendida-latest.html"),
    join(process.cwd(), "previsao-estendida-latest.html"),
  ];
  for (const path of candidates) {
    try {
      const html = await readFile(path, "utf8");
      if (html.length > 400) return html;
    } catch {
      /* next */
    }
  }
  return null;
}

function hasFutureDays(days: AlertaRioDayForecast[]): boolean {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return days.some((d) => d.date > today);
}

/** Fetch + parse da Estendida (Node-first; cache commitado se o WAF bloquear). */
export async function fetchPrevisaoEstendida(): Promise<AlertaRioDayForecast[]> {
  for (const url of [
    PREVISAO_ESTENDIDA_URL,
    "https://www.sistema-alerta-rio.com.br/upload/PrevisaoEstendida.html",
  ]) {
    const html = await fetchAlertaHtml(url);
    if (!html) continue;
    const days = parsePrevisaoEstendidaHtml(html);
    if (days.length && hasFutureDays(days)) return days;
  }

  const cached = await loadCachedEstendidaHtml();
  if (!cached) return [];
  const days = parsePrevisaoEstendidaHtml(cached);
  return hasFutureDays(days) ? days : [];
}
