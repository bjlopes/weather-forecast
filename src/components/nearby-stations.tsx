"use client";

import { useMemo } from "react";
import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StationRainingMark } from "@/components/station-raining-mark";
import type { LocationStatus, UserLocation } from "@/hooks/use-user-location";
import { distanceKm, formatDistanceKm } from "@/lib/alerta-rio/station-coords";
import type { StationHealth, UnifiedStation } from "@/lib/stations/types";
import { cn } from "@/lib/utils";

const NEARBY_RADIUS_KM = 1.5;

const HEALTH_CLASS: Record<StationHealth, string> = {
  ativa: "bg-brand-500/15 text-brand-400",
  atrasada: "bg-amber-500/15 text-amber-400",
  parada: "bg-red-500/15 text-red-400",
  desconhecida: "bg-slate-800 text-slate-400",
};

export type { UserLocation };

export function NearbyStationsPanel({
  stations,
  onOpenStation,
  location,
  locationStatus,
  locationError,
  onRequestLocation,
}: {
  stations: UnifiedStation[] | null;
  onOpenStation: (id: string) => void;
  location: UserLocation | null;
  locationStatus: LocationStatus;
  locationError: string | null;
  onRequestLocation: () => void;
}) {
  const nearby = useMemo(() => {
    if (!location || !stations?.length) return [];
    return stations
      .map((station) => {
        if (station.lat == null || station.lon == null) return null;
        const km = distanceKm(location.lat, location.lon, station.lat, station.lon);
        if (km > NEARBY_RADIUS_KM) return null;
        return { station, km };
      })
      .filter((x): x is { station: UnifiedStation; km: number } => x != null)
      .sort((a, b) => a.km - b.km)
      .slice(0, 5);
  }, [location, stations]);

  const nearest = nearby[0] ?? null;
  const ready = locationStatus === "ready" && location != null;

  return (
    <section id="perto" className="section-anchor glass rounded-xl p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="page-title text-slate-100">Perto de você</h2>
          <p className="mt-1 text-[13px] text-slate-400 sm:text-sm">
            Até {NEARBY_RADIUS_KM.toLocaleString("pt-BR")} km · todas as redes
          </p>
        </div>
        {!ready && (
          <Button
            type="button"
            size="sm"
            onClick={onRequestLocation}
            disabled={locationStatus === "loading" || !stations}
            className="h-10 border-0 bg-brand-500 text-slate-950 hover:bg-brand-400"
          >
            <Navigation className={cn("size-4", locationStatus === "loading" && "animate-pulse")} />
            {locationStatus === "loading" ? "Localizando…" : "Usar localização"}
          </Button>
        )}
      </div>

      {locationStatus === "idle" && (
        <p className="mt-4 text-sm text-slate-400">
          Ative a localização para ver estações perto de você e ordenar a lista Estações por
          distância.
        </p>
      )}

      {locationStatus === "error" && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-amber-400/90">{locationError}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRequestLocation}
            className="h-10 border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700/50"
          >
            Tentar de novo
          </Button>
        </div>
      )}

      {ready && nearest && (
        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={() => onOpenStation(nearest.station.id)}
            className="flex w-full items-start justify-between gap-3 rounded-xl border border-slate-700/60 bg-slate-950/50 px-4 py-4 text-left transition hover:border-brand-500/30 hover:bg-slate-900/80"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-slate-500 uppercase">
                <MapPin className="size-3.5 text-brand-400" />
                Mais próxima · {formatDistanceKm(nearest.km)}
              </p>
              <div className="mt-1.5 flex min-w-0 items-center gap-2">
                <p className="truncate text-lg font-bold text-slate-100">{nearest.station.name}</p>
                <StationRainingMark raining={nearest.station.raining} />
              </div>
              <p className="mt-0.5 text-sm text-slate-400">
                {nearest.station.networkLabel} · {nearest.station.readAt ?? "—"}
              </p>
              <p className="mt-3 text-sm text-slate-300">
                {nearest.station.weatherText ?? "Sem dado de chuva"}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span
                className={cn(
                  "inline-flex min-h-6 items-center rounded-md px-2.5 text-xs font-medium",
                  HEALTH_CLASS[nearest.station.health],
                )}
              >
                {nearest.station.healthLabel}
              </span>
              {nearest.station.raining != null && (
                <p className="mt-2 text-sm font-medium text-slate-200">
                  {nearest.station.raining ? "Chovendo" : "Sem chuva"}
                </p>
              )}
            </div>
          </button>

          {nearby.length > 1 && (
            <ul className="divide-y divide-slate-700/50">
              {nearby.slice(1).map(({ station, km }) => (
                <li key={station.id}>
                  <button
                    type="button"
                    onClick={() => onOpenStation(station.id)}
                    className="flex min-h-12 w-full items-center justify-between gap-3 py-2.5 text-left transition hover:bg-slate-800/40"
                  >
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-sm font-medium text-slate-200">{station.name}</p>
                        <StationRainingMark raining={station.raining} />
                      </div>
                      <p className="text-xs text-slate-500">
                        {formatDistanceKm(km)} · {station.networkLabel}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium",
                        HEALTH_CLASS[station.health],
                      )}
                    >
                      {station.healthLabel}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={onRequestLocation}
            className="text-xs font-medium text-brand-400 hover:text-brand-300"
          >
            Atualizar localização
          </button>
        </div>
      )}

      {ready && !nearest && (
        <p className="mt-4 text-sm text-slate-400">
          Nenhuma estação num raio de {NEARBY_RADIUS_KM.toLocaleString("pt-BR")} km. A lista
          Estações abaixo ainda ordena por proximidade.
        </p>
      )}
    </section>
  );
}
