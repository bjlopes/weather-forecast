import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { parsePrevisaoEstendidaHtml } from "@/lib/alerta-rio/estendida-parse";
import { parsePrevisao24hHtml } from "@/lib/alerta-rio/previsao-24h";

export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);

const TARGETS = [
  {
    name: "tempo-real",
    url: "https://alertario.rio.rj.gov.br/upload/TempoReal.html",
    referer: "https://alertario.rio.rj.gov.br/",
  },
  {
    name: "previsao-24h",
    url: "https://alertario.rio.rj.gov.br/upload/Previsao.html",
    referer: "https://alertario.rio.rj.gov.br/24-horas/",
  },
  {
    name: "estendida",
    url: "https://alertario.rio.rj.gov.br/upload/PrevisaoEstendida.html",
    referer: "https://alertario.rio.rj.gov.br/4-dias/",
  },
  {
    name: "cor-posts",
    url: "https://cor.rio/wp-json/wp/v2/posts?categories=29&per_page=2&_fields=id,date,title",
    referer: "https://cor.rio/",
  },
] as const;

async function probeCurl(url: string, referer: string) {
  const dir = await mkdtemp(join(tmpdir(), "diag-"));
  const bodyPath = join(dir, "body");
  try {
    const { stdout: code } = await execFileAsync(
      "/usr/bin/curl",
      [
        "-sS",
        "-L",
        "--max-time",
        "18",
        "-A",
        "Mozilla/5.0 (compatible; WeatherForecast/1.0)",
        "-H",
        "Accept: text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "-H",
        "Accept-Language: pt-BR,pt;q=0.9",
        "-H",
        `Referer: ${referer}`,
        "-o",
        bodyPath,
        "-w",
        "%{http_code}",
        url,
      ],
      { timeout: 22_000, encoding: "utf8" },
    );
    const body = await readFile(bodyPath, "utf8");
    return summarize(String(code).trim(), body);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function probeFetch(url: string, referer: string) {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9",
        Referer: referer,
        "User-Agent": "Mozilla/5.0 (compatible; WeatherForecast/1.0)",
      },
    });
    const body = await res.text();
    return summarize(String(res.status), body);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function summarize(status: string, body: string) {
  const rejected = body.includes("Request Rejected");
  const bot = /bot verification|lsrecaptcha/i.test(body);
  const hasTr = /<tr\b/i.test(body);
  let parsed24 = 0;
  let parsedExt = 0;
  if (hasTr && !rejected) {
    parsed24 = parsePrevisao24hHtml(body) ? 1 : 0;
    parsedExt = parsePrevisaoEstendidaHtml(body).length;
  }
  return {
    ok: status === "200" && !rejected && !bot && body.length > 400,
    status,
    len: body.length,
    rejected,
    bot,
    hasTr,
    parsed24,
    parsedExt,
    snippet: body.replace(/\s+/g, " ").slice(0, 160),
  };
}

export async function GET() {
  const results = [];
  for (const t of TARGETS) {
    const [curl, node] = await Promise.all([
      probeCurl(t.url, t.referer),
      probeFetch(t.url, t.referer),
    ]);
    results.push({ name: t.name, curl, node });
  }
  return Response.json(
    { fetchedAt: new Date().toISOString(), results },
    { headers: { "Cache-Control": "no-store" } },
  );
}
