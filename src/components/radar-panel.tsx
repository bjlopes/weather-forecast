"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, Radar, RefreshCw } from "lucide-react";
import { RadarMap } from "@/components/radar-map";
import type { RadarFeed } from "@/lib/alerta-rio/radar";
import { cn } from "@/lib/utils";

const FRAME_MS = 900;
const REFRESH_MS = 120_000;

function formatStamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = /[A-Za-z]{3},/.test(iso) ? new Date(iso) : new Date(iso);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }).format(d);
  } catch {
    return iso;
  }
}

export function RadarPanel({ className }: { className?: string }) {
  const [feed, setFeed] = useState<RadarFeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [loading, setLoading] = useState(true);
  const [broken, setBroken] = useState<Record<number, true>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    setBroken({});
    try {
      const res = await fetch("/api/radar", { cache: "no-store" });
      if (!res.ok) throw new Error("Não foi possível carregar o radar.");
      const json = (await res.json()) as RadarFeed;
      setFeed(json);
      setIndex(Math.max(0, (json.frames?.length ?? 1) - 1));
      for (const frame of json.frames ?? []) {
        const img = new Image();
        img.onerror = () => setBroken((prev) => ({ ...prev, [frame]: true }));
        img.src = `/api/radar/frame/${frame}?v=${json.bust}`;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar radar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const boot = window.setTimeout(() => void load(), 0);
    const id = window.setInterval(() => void load(), REFRESH_MS);
    return () => {
      window.clearTimeout(boot);
      window.clearInterval(id);
    };
  }, []);

  const frames = useMemo(() => feed?.frames ?? [], [feed]);
  const playable = useMemo(
    () => frames.filter((f) => !broken[f]),
    [frames, broken],
  );

  useEffect(() => {
    if (!playing || playable.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((i) => {
        const currentFrame = frames[i];
        const pos = playable.indexOf(currentFrame);
        const nextPos = pos >= 0 ? (pos + 1) % playable.length : 0;
        const nextFrame = playable[nextPos];
        return Math.max(0, frames.indexOf(nextFrame));
      });
    }, FRAME_MS);
    return () => window.clearInterval(id);
  }, [playing, playable, frames]);

  const current = frames[index];
  const src =
    feed?.available && current != null && !broken[current]
      ? `/api/radar/frame/${current}?v=${feed.bust}`
      : null;

  const showLive = Boolean(src) && playable.length > 0;

  return (
    <section id="radar" className={cn("section-anchor glass rounded-xl p-5", className)}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-slate-700/50 pb-3">
        <div>
          <h2 className="page-title text-slate-100">Radar Sumaré</h2>
          <p className="mt-1 text-sm text-slate-400">
            Mapa + refletividade · {formatStamp(feed?.lastModified ?? feed?.fetchedAt)}
          </p>
        </div>
        <a
          href={
            feed?.sourceUrl ??
            "https://alertario.rio.rj.gov.br/radar-meteorologico-do-sumare/imgens-recentes/"
          }
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-brand-400 hover:text-brand-300 hover:underline"
        >
          Fonte oficial
        </a>
      </div>

      <div className="relative isolate overflow-hidden rounded-xl border border-slate-700/50 bg-slate-950">
        <div className="relative h-[min(62dvh,34rem)] w-full sm:h-[min(68dvh,40rem)]">
          <RadarMap overlayUrl={showLive ? src : null} className="absolute inset-0 z-0 h-full w-full" />

          {!showLive && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-950/70 px-6 text-center">
              <Radar className="size-8 text-slate-500" />
              <p className="text-sm text-slate-400">
                {loading ? "Carregando radar…" : error || "Radar indisponível no momento."}
              </p>
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3">
            <div className="inline-flex items-center gap-2 rounded-lg bg-brand-500/20 px-2.5 py-1.5 text-[11px] font-bold tracking-wide text-brand-400 backdrop-blur-sm">
              <span
                className={cn(
                  "size-1.5 rounded-full bg-brand-400",
                  showLive && "animate-pulse",
                )}
              />
              {showLive ? "AO VIVO" : "OFFLINE"}
            </div>
            {showLive && (
              <div className="rounded-lg bg-slate-900/70 px-2.5 py-1.5 text-[11px] font-semibold tabular-nums text-slate-300 backdrop-blur-md">
                {index + 1}/{frames.length}
              </div>
            )}
          </div>

          <div className="absolute inset-x-0 bottom-0 z-20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700/50 bg-slate-900/70 px-2 py-2 backdrop-blur-md">
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  aria-label="Quadro anterior"
                  disabled={!showLive}
                  onClick={() =>
                    setIndex((i) => (frames.length ? (i - 1 + frames.length) % frames.length : 0))
                  }
                  className="touch-target inline-flex size-10 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-800/50 disabled:opacity-40"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  aria-label={playing ? "Pausar animação" : "Reproduzir animação"}
                  disabled={!showLive}
                  onClick={() => setPlaying((p) => !p)}
                  className="touch-target inline-flex size-10 items-center justify-center rounded-lg bg-brand-500/20 text-brand-400 transition hover:bg-brand-500/30 disabled:opacity-40"
                >
                  {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
                </button>
                <button
                  type="button"
                  aria-label="Próximo quadro"
                  disabled={!showLive}
                  onClick={() => setIndex((i) => (frames.length ? (i + 1) % frames.length : 0))}
                  className="touch-target inline-flex size-10 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-800/50 disabled:opacity-40"
                >
                  <ChevronRight className="size-5" />
                </button>
                <button
                  type="button"
                  aria-label="Atualizar radar"
                  onClick={() => void load()}
                  className="touch-target inline-flex size-10 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-800/50"
                >
                  <RefreshCw className={cn("size-4", loading && "animate-spin")} />
                </button>
              </div>
              <p className="pr-2 text-[11px] text-slate-500">Arraste · zoom</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-slate-400">
        <span className="font-bold tracking-wide uppercase">dBZ</span>
        {[
          { c: "bg-brand-500", t: "20 fraca" },
          { c: "bg-amber-400", t: "35 mod." },
          { c: "bg-orange-500", t: "45 forte" },
          { c: "bg-red-500", t: "50+ muito forte" },
        ].map((item) => (
          <span key={item.t} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2 rounded-sm", item.c)} />
            {item.t}
          </span>
        ))}
      </div>
    </section>
  );
}
