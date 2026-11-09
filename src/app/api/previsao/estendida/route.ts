import { fetchPrevisaoEstendida } from "@/lib/alerta-rio/estendida-fetch";

export const runtime = "edge";
export const dynamic = "force-dynamic";

/** Diagnóstico / fonte Edge da Estendida (dias já parseados). */
export async function GET() {
  try {
    const days = await fetchPrevisaoEstendida();
    if (!days.length) {
      return Response.json(
        { ok: false, count: 0 },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }
    return Response.json(
      { ok: true, count: days.length, days },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
