"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, Radar, RefreshCw } from "lucide-react";
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
      // Warm cache via same-origin proxy (upstream WAF needs Referer we can only set server-side).
      for (const frame of json.frames ?? []) {
        const img = new Image();
        img.src = `/api/radar/frame/${frame}?v=${json.bust}`;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar radar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  const frames = feed?.frames ?? [];
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
    feed?.available && current != null
      ? `/api/radar/frame/${current}?v=${feed.bust}`
      : null;

  const onImgError = () => {
    if (current != null) {
      setBroken((prev) => ({ ...prev, [current]: true }));
    }
  };

  const showLive = Boolean(src) && playable.length > 0;

  return (
    <section
      id="radar"
      className={cn(
        "mt-8 scroll-mt-[calc(1rem+env(safe-area-inset-top))] sm:mt-10",
        className,
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl text-[oklch(0.25_0.05_230)]">Radar Sumaré</h2>
          <p className="mt-1 text-sm text-[oklch(0.45_0.03_230)]">
            Live feed · últimas {feed?.frameCount ?? 20} imagens · atualiza a cada ~2 min
          </p>
        </div>
        <a
          href={
            feed?.sourceUrl ??
            "https://alertario.rio.rj.gov.br/radar-meteorologico-do-sumare/imgens-recentes/"
          }
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-[oklch(0.35_0.05_230)] underline-offset-2 hover:underline"
        >
          Fonte oficial
        </a>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/70 bg-[oklch(0.22_0.04_230)] shadow-[0_20px_50px_-30px_oklch(0.3_0.05_230)]">
        <div className="relative aspect-[4/3] w-full sm:aspect-[16/10]">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,oklch(0.32_0.05_210)_0%,oklch(0.18_0.03_230)_70%)]"
          />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage:
                "linear-gradient(oklch(0.7_0.02_220)/20 1px, transparent 1px), linear-gradient(90deg, oklch(0.7_0.02_220)/20 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          {showLive && src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt={`Radar Sumaré, quadro ${current} de ${frames.length}`}
              className="absolute inset-0 h-full w-full object-contain"
              draggable={false}
              onError={onImgError}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
              <Radar className="size-8 text-white/50" />
              <p className="text-sm text-white/75">
                {loading
                  ? "Carregando imagens do radar…"
                  : error ||
                    "Radar indisponível no momento (manutenção ou bloqueio da fonte)."}
              </p>
            </div>
          )}

          <div className="absolute top-3 left-3 flex items-center gap-2 rounded-md bg-black/45 px-2.5 py-1.5 text-[11px] font-medium tracking-wide text-white/90 backdrop-blur-sm">
            <span
              className={cn(
                "size-1.5 rounded-full",
                showLive ? "animate-pulse bg-emerald-400" : "bg-white/40",
              )}
            />
            {showLive ? "AO VIVO" : "OFFLINE"}
          </div>

          {showLive && (
            <div className="absolute top-3 right-3 rounded-md bg-black/45 px-2.5 py-1.5 text-[11px] tabular-nums text-white/85 backdrop-blur-sm">
              {index + 1}/{frames.length}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-black/25 px-3 py-3 sm:px-4">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Quadro anterior"
              disabled={!showLive}
              onClick={() =>
                setIndex((i) => (frames.length ? (i - 1 + frames.length) % frames.length : 0))
              }
              className="touch-target inline-flex size-10 items-center justify-center rounded-md text-white/85 transition hover:bg-white/10 disabled:opacity-40"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              aria-label={playing ? "Pausar animação" : "Reproduzir animação"}
              disabled={!showLive}
              onClick={() => setPlaying((p) => !p)}
              className="touch-target inline-flex size-10 items-center justify-center rounded-md bg-white/15 text-white transition hover:bg-white/25 disabled:opacity-40"
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
            <button
              type="button"
              aria-label="Próximo quadro"
              disabled={!showLive}
              onClick={() => setIndex((i) => (frames.length ? (i + 1) % frames.length : 0))}
              className="touch-target inline-flex size-10 items-center justify-center rounded-md text-white/85 transition hover:bg-white/10 disabled:opacity-40"
            >
              <ChevronRight className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Atualizar radar"
              onClick={() => void load()}
              className="touch-target inline-flex size-10 items-center justify-center rounded-md text-white/85 transition hover:bg-white/10"
            >
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            </button>
          </div>

          <p className="text-[11px] text-white/65 sm:text-xs">
            Última leitura {formatStamp(feed?.lastModified ?? feed?.fetchedAt)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[oklch(0.45_0.03_230)]">
        <span className="font-medium tracking-wide uppercase">dBZ</span>
        {[
          { c: "bg-[oklch(0.75_0.12_145)]", t: "20 fraca" },
          { c: "bg-[oklch(0.78_0.14_95)]", t: "35 mod." },
          { c: "bg-[oklch(0.72_0.16_55)]", t: "45 forte" },
          { c: "bg-[oklch(0.58_0.2_25)]", t: "50+ muito forte" },
        ].map((item) => (
          <span key={item.t} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-sm", item.c)} />
            {item.t}
          </span>
        ))}
      </div>
    </section>
  );
}
