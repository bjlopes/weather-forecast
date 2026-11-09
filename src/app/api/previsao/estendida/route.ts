export const runtime = "edge";
export const dynamic = "force-dynamic";

const URL = "https://alertario.rio.rj.gov.br/upload/PrevisaoEstendida.html";

/**
 * Proxy Edge da Previsão Estendida.
 * No Node serverless da Vercel o WAF do Alertario rejeita o HTML;
 * na Edge o fetch passa.
 */
export async function GET() {
  try {
    const res = await fetch(URL, {
      cache: "no-store",
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9",
        Referer: "https://alertario.rio.rj.gov.br/4-dias/",
        "User-Agent": "Mozilla/5.0 (compatible; WeatherForecast/1.0)",
      },
    });
    const html = await res.text();
    if (!res.ok || html.includes("Request Rejected") || !/<tr\b/i.test(html)) {
      return Response.json(
        {
          ok: false,
          status: res.status,
          rejected: html.includes("Request Rejected"),
          len: html.length,
        },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }
    return Response.json(
      { ok: true, html },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
