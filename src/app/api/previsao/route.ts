import { getForecastBulletin } from "@/lib/alerta-rio/forecast-fetch";

// Node (não Edge): precisa de curl para furar o WAF do Alerta Rio, como o radar.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const bulletin = await getForecastBulletin();
    return Response.json(bulletin, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao carregar previsão";
    return Response.json({ error: message }, { status: 502 });
  }
}
