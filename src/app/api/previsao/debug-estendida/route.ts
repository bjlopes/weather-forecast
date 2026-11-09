import {
  fetchPrevisaoEstendida,
  PREVISAO_ESTENDIDA_URL,
} from "@/lib/alerta-rio/extended-forecast";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  const probes: Array<Record<string, unknown>> = [];

  for (const agent of [
    "Mozilla/5.0 (compatible; WeatherForecast/1.0)",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  ]) {
    try {
      const res = await fetch(PREVISAO_ESTENDIDA_URL, {
        cache: "no-store",
        redirect: "follow",
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "pt-BR,pt;q=0.9",
          Referer: "https://alertario.rio.rj.gov.br/4-dias/",
          "User-Agent": agent,
        },
      });
      const html = await res.text();
      probes.push({
        agent,
        status: res.status,
        len: html.length,
        rejected: html.includes("Request Rejected"),
        hasTr: /<tr\b/i.test(html),
        head: html.slice(0, 160).replace(/\s+/g, " "),
      });
    } catch (e) {
      probes.push({ agent, error: e instanceof Error ? e.message : String(e) });
    }
  }

  const parsed = await fetchPrevisaoEstendida();
  return Response.json(
    {
      ms: Date.now() - started,
      parsedDays: parsed.length,
      days: parsed.map((d) => ({
        date: d.date,
        weekday: d.weekdayShort,
        trend: d.tempTrend,
        min: d.minTempC,
        max: d.maxTempC,
        precip: d.precip?.slice(0, 40) ?? null,
      })),
      probes,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
