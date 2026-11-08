import { getRadarFeed } from "@/lib/alerta-rio/radar";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const feed = await getRadarFeed();
    return Response.json(feed, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao carregar radar";
    return Response.json({ error: message }, { status: 502 });
  }
}
