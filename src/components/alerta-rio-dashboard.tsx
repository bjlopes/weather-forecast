"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Navigation, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ForecastDaysPanel, ForecastTodayPanel } from "@/components/forecast-panel";
import { NearbyStationsPanel } from "@/components/nearby-stations";
import { RadarPanel } from "@/components/radar-panel";
import { StationRainingMark } from "@/components/station-raining-mark";
import { UnifiedStationDetail } from "@/components/unified-station-detail";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { useUserLocation } from "@/hooks/use-user-location";
import type { ForecastBulletin } from "@/lib/alerta-rio/forecast-types";
import { distanceKm, formatDistanceKm } from "@/lib/alerta-rio/station-coords";
import type { AlertaRioSnapshot } from "@/lib/alerta-rio/types";
import type { StationHealth, StationNetwork, StationsSnapshot, UnifiedStation } from "@/lib/stations/types";
import { cn } from "@/lib/utils";

const NETWORK_FILTERS: Array<{ id: "Todas" | StationNetwork; label: string }> = [
  { id: "Todas", label: "Todas" },
  { id: "alerta_rio", label: "Alerta Rio" },
  { id: "inmet", label: "INMET" },
  { id: "cemaden", label: "CEMADEN" },
  { id: "metar", label: "Aeroporto" },
];

const SEGMENTS = [
  { id: "hoje", label: "Hoje" },
  { id: "dias", label: "Dias" },
  { id: "radar", label: "Radar" },
  { id: "estacoes", label: "Estações" },
] as const;

const HEALTH_CLASS: Record<StationHealth, string> = {
  ativa: "bg-brand-500/15 text-brand-400",
  atrasada: "bg-amber-500/15 text-amber-400",
  parada: "bg-red-500/15 text-red-400",
  desconhecida: "bg-slate-800 text-slate-400",
};

function formatMm(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function AlertaRioDashboard() {
  const [data, setData] = useState<AlertaRioSnapshot | null>(null);
  const [stationsSnap, setStationsSnap] = useState<StationsSnapshot | null>(null);
  const [forecast, setForecast] = useState<ForecastBulletin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [network, setNetwork] = useState<"Todas" | StationNetwork>("Todas");
  const [selectedId, setSelectedId] = useState<string | null>("alerta:16");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeSegment, setActiveSegment] = useState<(typeof SEGMENTS)[number]["id"]>("hoje");
  const [pending, setPending] = useState(false);
  const [radarRefreshToken, setRadarRefreshToken] = useState(0);
  const {
    location: userLocation,
    status: locationStatus,
    error: locationError,
    requestLocation,
  } = useUserLocation();

  const load = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      const [alertaRes, stationsRes, forecastRes] = await Promise.all([
        fetch("/api/alerta-rio", { cache: "no-store" }),
        fetch("/api/stations", { cache: "no-store" }),
        fetch("/api/previsao", { cache: "no-store" }),
      ]);
      if (!alertaRes.ok) throw new Error("Não foi possível carregar os dados do Alerta Rio.");
      const json = (await alertaRes.json()) as AlertaRioSnapshot;
      setData(json);

      if (stationsRes.ok) {
        const snap = (await stationsRes.json()) as StationsSnapshot;
        setStationsSnap(snap);
        setSelectedId((current) => {
          if (current && snap.stations.some((s) => s.id === current)) return current;
          return snap.stations.find((s) => s.id === "alerta:16")?.id ?? snap.stations[0]?.id ?? null;
        });
      }

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
    const id = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(id);
  }, [load]);

  // Abre sempre no topo (ignora #radar/#dias salvos e restauração de scroll).
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    if (window.location.hash) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    window.scrollTo(0, 0);
  }, []);

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
  }, [forecast, data, stationsSnap]);

  const filtered = useMemo(() => {
    if (!stationsSnap) return [] as Array<UnifiedStation & { distanceKm: number | null }>;
    const q = query.trim().toLowerCase();
    const healthRank = { ativa: 0, atrasada: 1, desconhecida: 2, parada: 3 } as const;
    return stationsSnap.stations
      .filter((s) => (network === "Todas" ? true : s.network === network))
      .filter((s) =>
        !q
          ? true
          : s.name.toLowerCase().includes(q) ||
            s.networkLabel.toLowerCase().includes(q) ||
            s.subtitle.toLowerCase().includes(q) ||
            s.id.toLowerCase().includes(q),
      )
      .map((s) => {
        const km =
          userLocation && s.lat != null && s.lon != null
            ? distanceKm(userLocation.lat, userLocation.lon, s.lat, s.lon)
            : null;
        return { ...s, distanceKm: km };
      })
      .sort((a, b) => {
        if (userLocation) {
          const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
          const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
          if (da !== db) return da - db;
        }
        const hr = healthRank[a.health] - healthRank[b.health];
        if (hr !== 0) return hr;
        return (b.rainMmH24 ?? -1) - (a.rainMmH24 ?? -1);
      });
  }, [stationsSnap, query, network, userLocation]);

  const selected = stationsSnap?.stations.find((s) => s.id === selectedId) ?? null;

  const openStation = (id: string) => {
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
          paddingTop: pull > 0 ? `calc(1rem + ${Math.min(pull * 0.35, 28)}px)` : undefined,
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
        <NearbyStationsPanel
          stations={stationsSnap?.stations ?? null}
          onOpenStation={openStation}
          location={userLocation}
          locationStatus={locationStatus}
          locationError={locationError}
          onRequestLocation={requestLocation}
        />

        <section id="estacoes" className="section-anchor glass rounded-xl p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="page-title text-slate-100">Estações</h2>
              <p className="mt-1 text-[13px] text-slate-400 sm:text-sm">
                {stationsSnap
                  ? userLocation
                    ? `${stationsSnap.counts.total} redes · ordenadas por proximidade`
                    : `${stationsSnap.counts.total} redes unificadas · toque para detalhe`
                  : "Alerta Rio · INMET · CEMADEN · aeroportos"}
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:max-w-xs">
              {!userLocation && (
                <Button
                  type="button"
                  size="sm"
                  onClick={requestLocation}
                  disabled={locationStatus === "loading" || !stationsSnap}
                  className="h-10 w-full border-0 bg-brand-500 text-slate-950 hover:bg-brand-400"
                >
                  <Navigation
                    className={cn("size-4", locationStatus === "loading" && "animate-pulse")}
                  />
                  {locationStatus === "loading" ? "Localizando…" : "Ordenar por proximidade"}
                </Button>
              )}
              {locationStatus === "error" && locationError && (
                <p className="text-xs text-amber-400/90">{locationError}</p>
              )}
              <div className="relative w-full">
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
          </div>

          <div className="-mx-1 mt-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {NETWORK_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setNetwork(item.id)}
                className={cn(
                  "touch-target shrink-0 rounded-lg border px-3.5 text-sm font-medium transition-colors",
                  network === item.id
                    ? "border-brand-500/40 bg-brand-500/20 text-brand-400"
                    : "border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700/50 hover:text-slate-200",
                )}
              >
                {item.label}
                {stationsSnap && item.id !== "Todas" ? (
                  <span className="ml-1 text-[11px] opacity-70">
                    {stationsSnap.counts[item.id]}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {error && (
            <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </p>
          )}
          {!stationsSnap && !error && (
            <p className="mt-8 animate-pulse text-sm text-slate-500">Carregando estações…</p>
          )}

          {stationsSnap && (
            <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1.05fr]">
              <ul className="max-h-[min(58dvh,32rem)] divide-y divide-slate-700/50 overflow-y-auto overscroll-contain lg:max-h-[32rem]">
                {filtered.length === 0 && (
                  <li className="px-1 py-6 text-sm text-slate-400">Nenhuma estação encontrada.</li>
                )}
                {filtered.map((station) => {
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
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate font-medium text-slate-200">{station.name}</p>
                            <StationRainingMark raining={station.raining} />
                          </div>
                          <p className="text-xs text-slate-500">
                            {station.networkLabel} · {station.readAt ?? "sem leitura"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          {station.distanceKm != null && (
                            <p className="text-sm font-semibold tabular-nums text-brand-400">
                              {formatDistanceKm(station.distanceKm)}
                            </p>
                          )}
                          <p
                            className={cn(
                              "text-sm font-bold tabular-nums text-slate-100",
                              station.distanceKm != null && "mt-0.5",
                            )}
                          >
                            {formatMm(station.rainMmH24 ?? station.rainMmH1 ?? station.rainMmM15)}
                            <span className="ml-1 text-[11px] font-medium text-slate-500">mm</span>
                          </p>
                          <span
                            className={cn(
                              "mt-1 inline-flex min-h-5 items-center rounded-md px-2 text-[11px] font-medium",
                              HEALTH_CLASS[station.health],
                            )}
                          >
                            {station.healthLabel}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <aside className="hidden border-l border-slate-700/50 pl-6 lg:block">
                {selected ? (
                  <UnifiedStationDetail station={selected} />
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
          Fontes: Alerta Rio / COR, INMET, CEMADEN e METAR (aeroportos). Não substitui avisos oficiais de
          emergência.
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

      {sheetOpen &&
        selected &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:hidden"
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
            <div className="sheet-panel relative z-10 my-auto max-h-[min(78dvh,40rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-700/50 bg-slate-900 px-5 py-4 shadow-xl">
              <div className="relative mb-3 min-h-11">
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="touch-target absolute top-0 right-0 inline-flex items-center justify-center rounded-lg bg-slate-800 text-slate-300"
                  aria-label="Fechar"
                >
                  <X className="size-5" />
                </button>
              </div>
              <UnifiedStationDetail station={selected} compact />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
