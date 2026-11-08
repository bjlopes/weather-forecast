import { fetchRadarFrameBytes, isValidRadarFrame } from "@/lib/alerta-rio/radar";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ n: string }> },
) {
  const { n } = await context.params;
  const frame = Number.parseInt(n, 10);
  if (!isValidRadarFrame(frame)) {
    return new Response("Frame inválido", { status: 400 });
  }

  const url = new URL(request.url);
  const bust = url.searchParams.get("v") ?? undefined;
  const image = await fetchRadarFrameBytes(frame, bust);
  if (!image) {
    return new Response("Imagem indisponível", { status: 404 });
  }

  return new Response(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=60",
      ...(image.lastModified ? { "Last-Modified": image.lastModified } : {}),
    },
  });
}
