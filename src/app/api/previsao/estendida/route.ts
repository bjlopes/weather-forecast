export const runtime = "edge";
export const dynamic = "force-dynamic";

const URL = "https://alertario.rio.rj.gov.br/upload/PrevisaoEstendida.html";

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
    return Response.json(
      {
        runtime: "edge",
        status: res.status,
        len: html.length,
        rejected: html.includes("Request Rejected"),
        hasTr: /<tr\b/i.test(html),
        dates: [...html.matchAll(/(\d{1,2}\/\d{1,2}\/\d{4})/g)].map((m) => m[1]),
        head: html.slice(0, 180).replace(/\s+/g, " "),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      { runtime: "edge", error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
