import { parsePrevisaoEstendidaHtml } from "@/lib/alerta-rio/estendida-parse";
import { parsePrevisao24hHtml } from "@/lib/alerta-rio/previsao-24h";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const TARGETS = [
  {
    name: "tempo-real",
    url: "https://alertario.rio.rj.gov.br/upload/TempoReal.html",
  },
  {
    name: "previsao-24h",
    url: "https://alertario.rio.rj.gov.br/upload/Previsao.html",
  },
  {
    name: "estendida",
    url: "https://alertario.rio.rj.gov.br/upload/PrevisaoEstendida.html",
  },
] as const;

async function probe(url: string) {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9",
        Referer: "https://alertario.rio.rj.gov.br/",
        "User-Agent": "Mozilla/5.0 (compatible; WeatherForecast/1.0)",
      },
    });
    const body = await res.text();
    const rejected = body.includes("Request Rejected");
    const hasTr = /<tr\b/i.test(body);
    return {
      ok: res.ok && !rejected && body.length > 400 && hasTr,
      status: res.status,
      len: body.length,
      rejected,
      hasTr,
      parsed24: !rejected && hasTr && parsePrevisao24hHtml(body) ? 1 : 0,
      parsedExt: !rejected && hasTr ? parsePrevisaoEstendidaHtml(body).length : 0,
      snippet: body.replace(/\s+/g, " ").slice(0, 140),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET() {
  const results = [];
  for (const t of TARGETS) {
    results.push({ name: t.name, edge: await probe(t.url) });
  }
  return Response.json(
    { fetchedAt: new Date().toISOString(), runtime: "edge", results },
    { headers: { "Cache-Control": "no-store" } },
  );
}
