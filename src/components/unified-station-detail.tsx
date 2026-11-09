"use client";

import { CloudRain, Thermometer, Wind } from "lucide-react";
import type { StationHealth, UnifiedStation } from "@/lib/stations/types";
import { cn } from "@/lib/utils";

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

function formatMaybe(value: number | null | undefined, suffix = ""): string {
  if (value == null) return "—";
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}${suffix}`;
}

export function UnifiedStationDetail({
  station,
  compact,
}: {
  station: UnifiedStation;
  compact?: boolean;
}) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {station.networkLabel}
          </p>
          <h3 className={cn("mt-1 font-bold text-slate-100", compact ? "text-xl" : "text-2xl")}>
            {station.name}
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            {station.subtitle}
            {station.readAt ? ` · ${station.readAt}` : ""}
          </p>
        </div>
        <span
          className={cn(
            "touch-target inline-flex items-center rounded-lg px-3 text-sm font-medium",
            HEALTH_CLASS[station.health],
          )}
        >
          {station.healthLabel}
        </span>
      </div>

      <div className="mt-5 rounded-xl border border-slate-700/50 bg-slate-950/60 px-4 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Situação</p>
        <p className="mt-1 text-lg font-semibold text-slate-100">
          {station.weatherText ?? "Sem informação"}
        </p>
        {station.raining != null && (
          <p className="mt-1 text-sm text-slate-400">
            {station.raining ? "Indício de chuva agora" : "Sem indício de chuva agora"}
          </p>
        )}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-x-3 gap-y-4">
        <div>
          <p className="text-xs text-slate-500">15 min</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-200">
            {formatMm(station.rainMmM15)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">1 h</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-200">
            {formatMm(station.rainMmH1)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">24 h</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-200">
            {formatMm(station.rainMmH24)}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-slate-700/50 pt-4">
        <p className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <CloudRain className="size-4 text-brand-400" />
          Meteorologia
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div>
            <p className="flex items-center gap-1 text-xs text-slate-500">
              <Thermometer className="size-3.5" />
              Temp.
            </p>
            <p className="mt-0.5 text-base font-semibold text-slate-200">
              {formatMaybe(station.temperatureC, "°")}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Umidade</p>
            <p className="mt-0.5 text-base font-semibold text-slate-200">
              {formatMaybe(station.humidityPct, "%")}
            </p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-xs text-slate-500">
              <Wind className="size-3.5" />
              Vento
            </p>
            <p className="mt-0.5 text-base font-semibold text-slate-200">
              {formatMaybe(station.windSpeedKmh, " km/h")}
            </p>
          </div>
        </div>
      </div>

      {station.detail && (
        <p className="mt-4 break-all rounded-lg bg-slate-950/50 px-3 py-2 font-mono text-[11px] text-slate-500">
          {station.detail}
        </p>
      )}
    </>
  );
}
