"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CloudRain, RefreshCw, Search, Thermometer, Wind, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ForecastDaysPanel, ForecastTodayPanel } from "@/components/forecast-panel";
import { RadarPanel } from "@/components/radar-panel";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { intensityLabel, rainIntensity } from "@/lib/alerta-rio/intensity";
import type { ForecastBulletin } from "@/lib/alerta-rio/forecast-types";
import type { AlertaRioSnapshot, RainIntensity, RainStation, ZoneName } from "@/lib/alerta-rio/types";
import { cn } from "@/lib/utils";

const ZONES: Array<ZoneName | "Todas"> = [
  "Todas",
  "Zona Sul",
  "Baía de Guanabara",
  "Barra/Jacarepaguá",
  "Baía de Sepetiba",
];

const SEGMENTS = [
  { id: "hoje", label: "Hoje" },
  { id: "dias", label: "Dias" },
  { id: "radar", label: "Radar" },
  { id: "estacoes", label: "Estações" },
] as const;

const INTENSITY_CLASS: Record<RainIntensity, string> = {
  seca: "bg-slate-800 text-slate-400",
  fraca: "bg-brand-500/15 text-brand-400",
  moderada: "bg-amber-500/15 text-amber-400",
  forte: "bg-orange-500/15 text-orange-400",
  muito_forte: "bg-red-500/15 text-red-400",
};

function formatMm(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function formatMaybe(value: number | null | undefined, suffix = ""): string {
  if (value == null) return "—";
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}${suffix}`;
}

function StationDetail({
  selected,
  meteo,
  selectedIntensity,
  compact,
}: {
  selected: RainStation;
  meteo: AlertaRioSnapshot["meteoStations"][number] | null;
  selectedIntensity: RainIntensity;
  compact?: boolean;
}) {
  const heroRain = selected.rainMm.h1 ?? selected.rainMm.m15 ?? selected.rainMm.h24;
  const heroLabel = selected.rainMm.h1 != null ? "1 h" : selected.rainMm.m15 != null ? "15 min" : "24 h";

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Estação {selected.id}
          </p>
          <h3 className={cn("mt-1 font-bold text-slate-100", compact ? "text-xl" : "text-2xl")}>
            {selected.name}
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            {selected.zone} · leitura {selected.readAt}
          </p>
        </div>
        <span
          className={cn(
            "touch-target inline-flex items-center rounded-lg px-3 text-sm font-medium",
            INTENSITY_CLASS[selectedIntensity],
          )}
        >
          {intensityLabel(selectedIntensity)}
        </span>
      </div>

      <div className="mt-5 rounded-xl border border-slate-700/50 bg-slate-950/60 px-4 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Chuva · {heroLabel}
        </p>
        <p className="mt-1 text-5xl font-bold leading-none tracking-tight text-slate-100 tabular-nums">
          {formatMm(heroRain)}
          <span className="ml-2 text-base font-medium text-slate-500">mm</span>
        </p>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-x-3 gap-y-4">
        {[
          { label: "15 min", value: selected.rainMm.m15 },
          { label: "1 h", value: selected.rainMm.h1 },
          { label: "4 h", value: selected.rainMm.h4 },
          { label: "24 h", value: selected.rainMm.h24 },
          { label: "96 h", value: selected.rainMm.h96 },
          { label: "Mês", value: selected.rainMm.month },
        ].map((item) => (
          <div key={item.label}>
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-200">
              {formatMm(item.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-slate-700/50 pt-4">
        <p className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <CloudRain className="size-4 text-brand-400" />
          Meteorologia
        </p>
        {meteo ? (
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div>
              <p className="flex items-center gap-1 text-xs text-slate-500">
                <Thermometer className="size-3.5" />
                Temp.
              </p>
              <p className="mt-0.5 text-base font-semibold text-slate-200">
                {formatMaybe(meteo.temperatureC, "°")}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Umidade</p>
              <p className="mt-0.5 text-base font-semibold text-slate-200">
                {formatMaybe(meteo.humidityPct, "%")}
              </p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs text-slate-500">
                <Wind className="size-3.5" />
                Vento
              </p>
              <p className="mt-0.5 text-base font-semibold text-slate-200">
                {formatMaybe(meteo.windSpeedKmh, " km/h")}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-400">
            Sem sensores meteorológicos no Tempo Real desta estação.
          </p>
        )}
      </div>
    </>
  );
}

export function AlertaRioDashboard() {
  const [data, setData] = useState<AlertaRioSnapshot | null>(null);
  const [forecast, setForecast] = useState<ForecastBulletin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [zone, setZone] = useState<ZoneName | "Todas">("Todas");
  const [selectedId, setSelectedId] = useState<number | null>(16);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeSegment, setActiveSegment] = useState<(typeof SEGMENTS)[number]["id"]>("hoje");
  const [pending, setPending] = useState(false);
  const [radarRefreshToken, setRadarRefreshToken] = useState(0);

  const load = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      const [stationsRes, forecastRes] = await Promise.all([
        fetch("/api/alerta-rio", { cache: "no-store" }),
        fetch("/api/previsao", { cache: "no-store" }),
      ]);
      if (!stationsRes.ok) throw new Error("Não foi possível carregar os dados do Alerta Rio.");
      const json = (await stationsRes.json()) as AlertaRioSnapshot;
      setData(json);
      setSelectedId((current) => {
        if (current && json.rainStations.some((s) => s.id === current)) return current;
        return json.rainStations[0]?.id ?? null;
      });
      if (forecastRes.ok) {
        setForecast((await forecastRes.json()) as ForecastBulletin);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setPending(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await load();
    setRadarRefreshToken((n) => n + 1);
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  const { pull, refreshing, ready, indicatorHeight } = usePullToRefresh(
    refreshAll,
    !sheetOpen,
  );
  const showPull = pull > 0 || refreshing;

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [sheetOpen]);

  useEffect(() => {
    const nodes = SEGMENTS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    if (nodes.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible?.target?.id) return;
        setActiveSegment(visible.target.id as (typeof SEGMENTS)[number]["id"]);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.15, 0.35, 0.55] },
    );
    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [forecast, data]);

  const filtered = useMemo(() => {
    if (!data) return [] as RainStation[];
    const q = query.trim().toLowerCase();
    return data.rainStations
      .filter((s) => (zone === "Todas" ? true : s.zone === zone))
      .filter((s) => (!q ? true : s.name.toLowerCase().includes(q) || String(s.id).includes(q)))
      .sort((a, b) => (b.rainMm.h24 ?? 0) - (a.rainMm.h24 ?? 0));
  }, [data, query, zone]);

  const selected = data?.rainStations.find((s) => s.id === selectedId) ?? null;
  const meteo = data?.meteoStations.find((s) => s.id === selectedId) ?? null;
  const selectedIntensity = rainIntensity(selected ? (selected.rainMm.h1 ?? selected.rainMm.m15) : null);

  const openStation = (id: number) => {
    setSelectedId(id);
    setSheetOpen(true);
  };

  return (
    <div className="min-h-dvh overflow-x-hidden overscroll-y-contain bg-slate-950 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <div
        className="pointer-events-none fixed inset-x-0 z-50 flex justify-center transition-[height,opacity] duration-150 ease-out"
        style={{
          top: "env(safe-area-inset-top)",
          height: showPull ? indicatorHeight : 0,
          opacity: showPull ? 1 : 0,
        }}
        aria-hidden={!showPull}
      >
        <div className="flex items-end pb-1">
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/90 px-3 py-1.5 text-[12px] font-medium text-slate-300 shadow-lg backdrop-blur-md",
              (refreshing || pending) && "text-brand-400",
            )}
          >
            <RefreshCw
              className={cn(
                "size-3.5",
                (refreshing || pending || ready) && "animate-spin",
              )}
            />
            {refreshing || pending ? "Atualizando…" : ready ? "Solte para atualizar" : "Puxe para atualizar"}
          </div>
        </div>
      </div>

      <header className="glass sticky top-0 z-40 border-b border-slate-700/50 pt-[env(safe-area-inset-top)]">
        <div className="safe-pad-x mx-auto flex w-full max-w-[min(100%,56rem)] items-center justify-between gap-3 py-2.5 sm:py-3 lg:max-w-[min(100%,72rem)]">
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-brand-500 sm:text-lg">Alerta Rio</p>
            <p className="truncate text-[11px] text-slate-500 sm:text-xs">Tempo · chuva · COR</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refreshAll()}
            disabled={pending || refreshing}
            className="touch-target hidden h-10 border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700/50 hover:text-slate-100 lg:inline-flex"
          >
            <RefreshCw className={cn("size-4", (pending || refreshing) && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </header>

      <main
        className="safe-pad-x mx-auto w-full max-w-[min(100%,56rem)] space-y-4 py-4 sm:space-y-6 sm:py-5 lg:max-w-[min(100%,72rem)]"
        style={{
          transform: pull > 0 ? `translateY(${Math.min(pull * 0.35, 28)}px)` : undefined,
          transition: pull > 0 ? "none" : "transform 180ms ease-out",
        }}
      >
        <nav
          aria-label="Seções"
          className="sticky z-30 -mx-1 px-1 py-0.5 backdrop-blur-sm sm:py-1"
          style={{ top: "calc(env(safe-area-inset-top) + 3.25rem)" }}
        >
          <div
            className="inline-flex w-full rounded-lg border border-slate-700 bg-slate-800/80 p-0.5"
            role="tablist"
          >
            {SEGMENTS.map((seg) => (
              <a
                key={seg.id}
                href={`#${seg.id}`}
                role="tab"
                aria-selected={activeSegment === seg.id}
                className={cn(
                  "touch-target flex flex-1 items-center justify-center rounded-md px-1.5 text-center text-[13px] font-medium transition-colors sm:px-3 sm:text-sm",
                  activeSegment === seg.id
                    ? "bg-brand-500/20 text-brand-400"
                    : "text-slate-400 hover:bg-slate-700/40 hover:text-slate-200",
                )}
              >
                {seg.label}
              </a>
            ))}
          </div>
        </nav>

        <ForecastTodayPanel forecast={forecast} />
        <ForecastDaysPanel forecast={forecast} />
        <RadarPanel refreshToken={radarRefreshToken} />

        <section id="estacoes" className="section-anchor glass rounded-xl p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="page-title text-slate-100">Estações</h2>
              <p className="mt-1 text-[13px] text-slate-400 sm:text-sm">Tempo Real · toque para detalhe</p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar estação…"
                className="h-11 border-slate-700 bg-slate-800 pl-9 text-slate-200 shadow-none placeholder:text-slate-500"
                aria-label="Buscar estação"
              />
            </div>
          </div>

          <div className="-mx-1 mt-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {ZONES.map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZone(z)}
                className={cn(
                  "touch-target shrink-0 rounded-lg border px-3.5 text-sm font-medium transition-colors",
                  zone === z
                    ? "border-brand-500/40 bg-brand-500/20 text-brand-400"
                    : "border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700/50 hover:text-slate-200",
                )}
              >
                {z}
              </button>
            ))}
          </div>

          {error && (
            <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </p>
          )}
          {!data && !error && (
            <p className="mt-8 animate-pulse text-sm text-slate-500">Carregando estações…</p>
          )}

          {data && (
            <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1.05fr]">
              <ul className="max-h-[min(58dvh,32rem)] divide-y divide-slate-700/50 overflow-y-auto overscroll-contain lg:max-h-[32rem]">
                {filtered.length === 0 && (
                  <li className="px-1 py-6 text-sm text-slate-400">Nenhuma estação encontrada.</li>
                )}
                {filtered.map((station) => {
                  const intensity = rainIntensity(station.rainMm.h1 ?? station.rainMm.m15);
                  const active = station.id === selectedId;
                  return (
                    <li key={station.id}>
                      <button
                        type="button"
                        onClick={() => openStation(station.id)}
                        className={cn(
                          "flex min-h-14 w-full items-center justify-between gap-3 rounded-lg px-2 py-3 text-left transition-colors",
                          active
                            ? "bg-brand-500/10"
                            : "hover:bg-slate-800/50 active:bg-slate-800/70",
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-200">{station.name}</p>
                          <p className="text-xs text-slate-500">
                            {station.zone} · {station.readAt}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold tabular-nums text-slate-100">
                            {formatMm(station.rainMm.h24)}
                            <span className="ml-1 text-[11px] font-medium text-slate-500">mm</span>
                          </p>
                          <span
                            className={cn(
                              "mt-1 inline-flex min-h-5 items-center rounded-md px-2 text-[11px] font-medium",
                              INTENSITY_CLASS[intensity],
                            )}
                          >
                            {intensityLabel(intensity)}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <aside className="hidden border-l border-slate-700/50 pl-6 lg:block">
                {selected ? (
                  <StationDetail selected={selected} meteo={meteo} selectedIntensity={selectedIntensity} />
                ) : (
                  <p className="text-sm text-slate-400">Selecione uma estação.</p>
                )}
              </aside>
            </div>
          )}
        </section>

        <section className="glass rounded-xl p-4 sm:p-5" aria-label="Situação por zona">
          <h2 className="text-base font-semibold text-slate-200 sm:text-lg">Situação por zona</h2>
          {data?.zones?.length ? (
            <ul className="mt-3 divide-y divide-slate-700/50">
              {data.zones.map((z) => (
                <li key={z.zone} className="flex min-h-11 items-center justify-between gap-3 py-3">
                  <span className="text-sm font-medium text-slate-200">{z.zone}</span>
                  <span className="text-right text-xs text-slate-400">
                    {z.rainStage} · risco {z.landslideRisk.toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-400">
              Aparece quando o Alerta Rio publica os estágios de chuva.
            </p>
          )}
          {data && (
            <p className="mt-4 text-xs text-slate-500">
              {data.source === "live"
                ? "Dados ao vivo do Alerta Rio"
                : "Amostra do Alerta Rio (fonte ao vivo indisponível)"}
            </p>
          )}
        </section>

        <footer className="border-t border-slate-700/50 pt-4 pb-2 text-xs text-slate-500">
          Fonte: Sistema Alerta Rio / Centro de Operações Rio. Não substitui avisos oficiais de emergência.
        </footer>
      </main>

      <div className="safe-bottom-bar glass fixed inset-x-0 bottom-0 z-40 border-t border-slate-700/50 px-3 pt-2 sm:px-4 sm:pt-2.5 lg:hidden">
        <div className="mx-auto flex max-w-[min(100%,56rem)] items-center gap-2">
          <Button
            onClick={load}
            disabled={pending}
            className="touch-target h-11 flex-1 bg-brand-500 text-slate-950 hover:bg-brand-400"
          >
            <RefreshCw className={cn("size-4", pending && "animate-spin")} />
            Atualizar
          </Button>
          <a
            href="https://alertario.rio.rj.gov.br/"
            target="_blank"
            rel="noreferrer"
            className="touch-target inline-flex h-11 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-3.5 text-sm font-medium text-slate-300 sm:px-4"
          >
            Oficial
          </a>
        </div>
      </div>

      {sheetOpen && selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={`Detalhe ${selected.name}`}
        >
          <button
            type="button"
            className="sheet-backdrop absolute inset-0 bg-black/60"
            aria-label="Fechar detalhe"
            onClick={() => setSheetOpen(false)}
          />
          <div className="sheet-panel relative z-10 w-full max-w-md overflow-y-auto rounded-2xl border border-slate-700/50 bg-slate-900 px-5 py-4 shadow-xl">
            <div className="relative mb-3">
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="touch-target absolute top-0 right-0 inline-flex items-center justify-center rounded-lg bg-slate-800 text-slate-300"
                aria-label="Fechar"
              >
                <X className="size-5" />
              </button>
            </div>
            <StationDetail selected={selected} meteo={meteo} selectedIntensity={selectedIntensity} compact />
          </div>
        </div>
      )}
    </div>
  );
}
