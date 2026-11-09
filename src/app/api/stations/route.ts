import { getUnifiedStationsSnapshot } from "@/lib/stations/aggregate";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getUnifiedStationsSnapshot();
    return Response.json(snapshot, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao carregar estações";
    return Response.json({ error: message }, { status: 502 });
  }
}
