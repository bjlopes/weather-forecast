import {
  type AlertaRioDayForecast,
  parsePrevisaoEstendidaHtml,
  PREVISAO_ESTENDIDA_URL,
} from "./estendida-parse";

/** Fetch + parse da Estendida via fetch puro (Edge-safe; WAF libera na Edge). */
export async function fetchPrevisaoEstendida(): Promise<AlertaRioDayForecast[]> {
  try {
    const res = await fetch(PREVISAO_ESTENDIDA_URL, {
      cache: "no-store",
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9",
        Referer: "https://alertario.rio.rj.gov.br/4-dias/",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    const html = await res.text();
    if (!res.ok || html.includes("Request Rejected") || !/<tr\b/i.test(html)) {
      return [];
    }
    return parsePrevisaoEstendidaHtml(html);
  } catch {
    return [];
  }
}
