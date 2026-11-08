import { getAlertaRioSnapshot } from "@/lib/alerta-rio/fetch";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getAlertaRioSnapshot();
    return Response.json(snapshot, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao carregar Alerta Rio";
    return Response.json({ error: message }, { status: 502 });
  }
}
