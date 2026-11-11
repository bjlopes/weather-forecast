import { fetchAlertaHtml } from "./alerta-html-fetch";
import {
  type AlertaRioDayForecast,
  parsePrevisaoEstendidaHtml,
  PREVISAO_ESTENDIDA_URL,
} from "./estendida-parse";

/** Fetch + parse da Estendida. Curl primeiro (WAF); Node como fallback. */
export async function fetchPrevisaoEstendida(): Promise<AlertaRioDayForecast[]> {
  // Sem query-string: o WAF rejeita cache-bust em vários endpoints do Alerta Rio.
  const candidates = [
    PREVISAO_ESTENDIDA_URL,
    "https://alertario.rio.rj.gov.br/upload/PrevisaoEstendida.htm",
  ];
  for (const url of candidates) {
    const html = await fetchAlertaHtml(url, "https://alertario.rio.rj.gov.br/4-dias/");
    if (!html) continue;
    const parsed = parsePrevisaoEstendidaHtml(html);
    if (parsed.length) return parsed;
  }
  return [];
}
