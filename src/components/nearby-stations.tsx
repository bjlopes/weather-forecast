"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StationRainingMark } from "@/components/station-raining-mark";
import { distanceKm, formatDistanceKm } from "@/lib/alerta-rio/station-coords";
import type { StationHealth, UnifiedStation } from "@/lib/stations/types";
import { cn } from "@/lib/utils";

const NEARBY_RADIUS_KM = 1.5;

export type UserLocation = { lat: number; lon: number };

type GeoState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; lat: number; lon: number }
  | { status: "error"; message: string };

const HEALTH_CLASS: Record<StationHealth, string> = {
  ativa: "bg-brand-500/15 text-brand-400",
  atrasada: "bg-amber-500/15 text-amber-400",
  parada: "bg-red-500/15 text-red-400",
  desconhecida: "bg-slate-800 text-slate-400",
};

export function NearbyStationsPanel({
  stations,
  onOpenStation,
  onLocationChange,
}: {
  stations: UnifiedStation[] | null;
  onOpenStation: (id: string) => void;
  /** Notifica o dashboard quando a localização fica pronta (ou some). */
  onLocationChange?: (location: UserLocation | null) => void;
}) {
  const [geo, setGeo] = useState<GeoState>({ status: "idle" });

  useEffect(() => {
    if (!onLocationChange) return;
    if (geo.status === "ready") {
      onLocationChange({ lat: geo.lat, lon: geo.lon });
    } else {
      onLocationChange(null);
    }
  }, [geo, onLocationChange]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeo({ status: "error", message: "Geolocalização não disponível neste dispositivo." });
      return;
    }
    setGeo({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          status: "ready",
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
      },
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? "Permissão de localização negada."
            : err.code === err.POSITION_UNAVAILABLE
              ? "Não foi possível obter a posição."
              : "Tempo esgotado ao obter a localização.";
        setGeo({ status: "error", message });
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60_000 },
    );
  }, []);

  const nearby = useMemo(() => {
    if (geo.status !== "ready" || !stations?.length) return [];
    return stations
      .map((station) => {
        if (station.lat == null || station.lon == null) return null;
        const km = distanceKm(geo.lat, geo.lon, station.lat, station.lon);
        if (km > NEARBY_RADIUS_KM) return null;
        return { station, km };
      })
      .filter((x): x is { station: UnifiedStation; km: number } => x != null)
      .sort((a, b) => a.km - b.km)
      .slice(0, 5);
  }, [geo, stations]);

  const nearest = nearby[0] ?? null;

  return (
    <section id="perto" className="section-anchor glass rounded-xl p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="page-title text-slate-100">Perto de você</h2>
          <p className="mt-1 text-[13px] text-slate-400 sm:text-sm">
            Até {NEARBY_RADIUS_KM.toLocaleString("pt-BR")} km · todas as redes
          </p>
        </div>
        {geo.status !== "ready" && (
          <Button
            type="button"
            size="sm"
            onClick={requestLocation}
            disabled={geo.status === "loading" || !stations}
            className="h-10 border-0 bg-brand-500 text-slate-950 hover:bg-brand-400"
          >
            <Navigation className={cn("size-4", geo.status === "loading" && "animate-pulse")} />
            {geo.status === "loading" ? "Localizando…" : "Usar localização"}
          </Button>
        )}
      </div>

      {geo.status === "idle" && (
        <p className="mt-4 text-sm text-slate-400">
          Ative a localização para ver estações Alerta Rio, INMET, CEMADEN e aeroportos perto de
          você. A lista completa também passa a ordenar por proximidade.
        </p>
      )}

      {geo.status === "error" && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-amber-400/90">{geo.message}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={requestLocation}
            className="h-10 border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700/50"
          >
            Tentar de novo
          </Button>
        </div>
      )}

      {geo.status === "ready" && nearest && (
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
            onClick={requestLocation}
            className="text-xs font-medium text-brand-400 hover:text-brand-300"
          >
            Atualizar localização
          </button>
        </div>
      )}

      {geo.status === "ready" && !nearest && (
        <p className="mt-4 text-sm text-slate-400">
          Nenhuma estação num raio de {NEARBY_RADIUS_KM.toLocaleString("pt-BR")} km. A lista
          completa abaixo ainda ordena por proximidade.
        </p>
      )}
    </section>
  );
}
