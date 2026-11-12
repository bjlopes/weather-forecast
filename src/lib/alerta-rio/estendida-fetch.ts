import { fetchAlertaHtml } from "./alerta-html-fetch";
import {
  type AlertaRioDayForecast,
  parsePrevisaoEstendidaHtml,
  PREVISAO_ESTENDIDA_URL,
} from "./estendida-parse";

/** Fetch + parse da Estendida (Node-first; mesmo padrão do TempoReal). */
export async function fetchPrevisaoEstendida(): Promise<AlertaRioDayForecast[]> {
  const html = await fetchAlertaHtml(PREVISAO_ESTENDIDA_URL);
  if (!html) return [];
  return parsePrevisaoEstendidaHtml(html);
}
