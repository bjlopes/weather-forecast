import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const RADAR_FRAME_COUNT = 20;
export const RADAR_SOURCE_PAGE =
  "https://alertario.rio.rj.gov.br/radar-meteorologico-do-sumare/imgens-recentes/";
export const RADAR_ORIGIN_BASE =
  "https://alertario.rio.rj.gov.br/upload/Mapa/semfundo/radar";

export type RadarFeed = {
  available: boolean;
  frames: number[];
  frameCount: number;
  bust: string;
  fetchedAt: string;
  lastModified: string | null;
  sourceUrl: string;
  /** Prefer these in <img> — browser TLS usually clears the municipal WAF. */
  frameUrls: string[];
  source: "live" | "unavailable";
};

export function radarUpstreamUrl(frame: number): string {
  // Do not append cache-bust query params — the municipal WAF rejects them.
  const n = String(frame).padStart(3, "0");
  return `${RADAR_ORIGIN_BASE}${n}.png`;
}

export function isValidRadarFrame(frame: number): boolean {
  return Number.isInteger(frame) && frame >= 1 && frame <= RADAR_FRAME_COUNT;
}

function isPng(bytes: Buffer): boolean {
  return bytes.length >= 1000 && bytes[0] === 0x89 && bytes[1] === 0x50;
}

/** Municipal WAF blocks Node's TLS fingerprint; curl (and browsers) still pass. */
async function curlBytes(
  url: string,
): Promise<{ bytes: Buffer; lastModified: string | null } | null> {
  const dir = await mkdtemp(join(tmpdir(), "radar-"));
  const bodyPath = join(dir, "body.bin");
  try {
    const { stdout: code } = await execFileAsync(
      "/usr/bin/curl",
      [
        "-sS",
        "-L",
        "--max-time",
        "15",
        "-A",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "-H",
        "Accept: image/png,image/webp,*/*;q=0.8",
        "-H",
        `Referer: ${RADAR_SOURCE_PAGE}`,
        "-o",
        bodyPath,
        "-w",
        "%{http_code}",
        url,
      ],
      { timeout: 20_000, encoding: "utf8" },
    );
    if (String(code).trim() !== "200") return null;
    const bytes = await readFile(bodyPath);
    if (!isPng(bytes)) return null;
    return { bytes, lastModified: null };
  } catch {
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function nodeFetchBytes(
  url: string,
): Promise<{ bytes: Buffer; lastModified: string | null } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: "image/png,image/webp,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: RADAR_SOURCE_PAGE,
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("image")) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (!isPng(bytes)) return null;
    return { bytes, lastModified: res.headers.get("last-modified") };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchRadarFrameBytes(
  frame: number,
): Promise<{ bytes: Buffer; contentType: string; lastModified: string | null } | null> {
  if (!isValidRadarFrame(frame)) return null;
  const url = radarUpstreamUrl(frame);
  const viaCurl = await curlBytes(url);
  if (viaCurl) {
    return { bytes: viaCurl.bytes, contentType: "image/png", lastModified: viaCurl.lastModified };
  }
  const viaNode = await nodeFetchBytes(url);
  if (viaNode) {
    return { bytes: viaNode.bytes, contentType: "image/png", lastModified: viaNode.lastModified };
  }
  return null;
}

export async function getRadarFeed(): Promise<RadarFeed> {
  const bust = String(Date.now());
  const fetchedAt = new Date().toISOString();
  const frames = Array.from({ length: RADAR_FRAME_COUNT }, (_, i) => i + 1);
  const frameUrls = frames.map((f) => radarUpstreamUrl(f));

  const latest = await fetchRadarFrameBytes(RADAR_FRAME_COUNT);
  const lastModified = latest ? await curlLastModified(radarUpstreamUrl(RADAR_FRAME_COUNT)) : null;

  return {
    available: Boolean(latest),
    frames,
    frameCount: RADAR_FRAME_COUNT,
    bust,
    fetchedAt,
    lastModified: lastModified ?? latest?.lastModified ?? null,
    sourceUrl: RADAR_SOURCE_PAGE,
    frameUrls,
    source: latest ? "live" : "unavailable",
  };
}

async function curlLastModified(url: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      "/usr/bin/curl",
      [
        "-sS",
        "-L",
        "-I",
        "--max-time",
        "10",
        "-A",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "-H",
        `Referer: ${RADAR_SOURCE_PAGE}`,
        url,
      ],
      { timeout: 15_000, encoding: "utf8" },
    );
    return String(stdout).match(/last-modified:\s*(.+)/i)?.[1]?.trim() ?? null;
  } catch {
    return null;
  }
}
