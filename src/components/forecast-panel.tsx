"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, ChevronRight, X } from "lucide-react";
import type { ForecastBulletin, ForecastDay, TempTrend } from "@/lib/alerta-rio/forecast-types";
import { polishProse } from "@/lib/alerta-rio/forecast-parse";
import {
  weatherKindFromText,
  weatherMeta,
  WeatherGlyph,
  type WeatherKind,
} from "@/lib/alerta-rio/weather-icon";
import { cn } from "@/lib/utils";

function formatPublished(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const TREND_UI: Record<
  TempTrend,
  { label: string; short: string; className: string; Icon: typeof ArrowDownRight }
> = {
  declinio: {
    label: "Declínio",
    short: "↓",
    className: "text-sky-300",
    Icon: ArrowDownRight,
  },
  estavel: {
    label: "Estável",
    short: "→",
    className: "text-slate-300",
    Icon: ArrowRight,
  },
  elevacao: {
    label: "Elevação",
    short: "↑",
    className: "text-amber-300",
    Icon: ArrowUpRight,
  },
};

/** Remove "durante… / a partir… / entre…" para caber no card. */
function shortPrecip(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const base = polishProse(raw)
    .split(/\s+(?:durante|a partir|entre|no período|pela|pela manhã|à tarde)\b/i)[0]
    .trim()
    .replace(/[.,;:\s]+$/, "");
  return base || null;
}

/** Temperaturas compactas que cabem em cards estreitos. */
function TempChip({
  minTempC,
  maxTempC,
  tempTrend,
  className,
}: {
  minTempC: number | null;
  maxTempC: number | null;
  tempTrend?: TempTrend | null;
  className?: string;
}) {
  if (minTempC == null && maxTempC == null && !tempTrend) return null;
  const trend = tempTrend ? TREND_UI[tempTrend] : null;
  const TrendIcon = trend?.Icon;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 tabular-nums",
        className,
      )}
    >
      {minTempC != null && (
        <span className="text-sm font-semibold text-slate-400">
          {minTempC}°
          <span className="ml-0.5 text-[9px] font-medium tracking-wide text-slate-500 uppercase">
            mín
          </span>
        </span>
      )}
      {maxTempC != null && (
        <span className="text-base font-bold text-brand-400">
          {maxTempC}°
          <span className="ml-0.5 text-[9px] font-medium tracking-wide text-brand-400/70 uppercase">
            máx
          </span>
        </span>
      )}
      {trend && TrendIcon && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-[11px] font-medium",
            trend.className,
          )}
          title={trend.label}
        >
          <TrendIcon className="size-3.5 shrink-0" />
          <span className="truncate">{trend.label}</span>
        </span>
      )}
    </div>
  );
}

function DetailSheet({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string | null;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className="sheet-backdrop absolute inset-0 bg-black/60"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="sheet-panel relative z-10 w-full max-w-md overflow-y-auto rounded-2xl border border-slate-700/50 bg-slate-900 px-5 py-4 shadow-xl">
        <div className="relative mb-4">
          <button
            type="button"
            onClick={onClose}
            className="touch-target absolute top-0 right-0 inline-flex items-center justify-center rounded-lg bg-slate-800 text-slate-300"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
          <h3 className="pr-12 text-xl font-bold text-slate-100">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
        </div>
        <div className="pb-1">{children}</div>
      </div>
    </div>
  );
}

/** Sinótica sempre completa; toque abre detalhe das próximas 24h. */
export function ForecastTodayPanel({
  forecast,
  className,
}: {
  forecast: ForecastBulletin | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!forecast) {
    return (
      <section id="hoje" className={cn("section-anchor glass rounded-xl p-4", className)} aria-busy="true">
        <p className="animate-pulse text-sm text-slate-500">Carregando previsão do Alerta Rio…</p>
      </section>
    );
  }

  const title = polishProse(forecast.title);
  const synoptic = polishProse(forecast.synoptic);
  const detail24h = polishProse(forecast.detail24h);
  const todayKind = weatherKindFromText(title, detail24h, synoptic);
  const todayMeta = weatherMeta(todayKind);

  return (
    <>
      <section id="hoje" className={cn("section-anchor glass overflow-hidden rounded-xl p-4 sm:p-5", className)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="page-title text-slate-100">Hoje</h2>
            <p className="mt-1 text-[12px] text-slate-500 sm:text-[13px]">
              Boletim COR · {formatPublished(forecast.publishedAt)}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-0.5">
            <WeatherGlyph kind={todayKind} size="lg" />
            <span className="text-[10px] font-medium tracking-wide text-slate-500 uppercase">
              {todayMeta.label}
            </span>
          </div>
        </div>

        <TempChip
          className="mt-3"
          minTempC={forecast.minTempC}
          maxTempC={forecast.maxTempC}
          tempTrend={forecast.tempTrend}
        />

        <h3 className="mt-3 text-[15px] leading-snug font-medium text-slate-200">{title}</h3>

        <div className="mt-4">
          <p className="text-[11px] font-medium tracking-wide text-brand-400 uppercase">Sinótica</p>
          <p className="mt-2 text-[15px] leading-relaxed whitespace-normal text-slate-300">
            {synoptic}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-slate-700/50 bg-slate-950/40 px-3 text-left text-sm font-medium text-slate-300 transition-colors active:bg-slate-800/50"
        >
          <span>Próximas 24 horas</span>
          <ChevronRight className="size-4 shrink-0 text-slate-500" aria-hidden />
        </button>

        <a
          href={forecast.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-brand-400"
        >
          Fonte oficial COR
        </a>
      </section>

      <DetailSheet
        open={open}
        title="Próximas 24 horas"
        subtitle={`Boletim COR · ${formatPublished(forecast.publishedAt)}`}
        onClose={() => setOpen(false)}
      >
        <div className="mb-4 flex items-center gap-3">
          <WeatherGlyph kind={todayKind} size="lg" />
          <div className="min-w-0">
            <p className="font-semibold text-slate-100">{todayMeta.label}</p>
            <TempChip
              className="mt-1"
              minTempC={forecast.minTempC}
              maxTempC={forecast.maxTempC}
              tempTrend={forecast.tempTrend}
            />
          </div>
        </div>

        <p className="text-[15px] leading-relaxed text-slate-300">{detail24h}</p>
      </DetailSheet>
    </>
  );
}

function DayCard({
  day,
  onOpen,
}: {
  day: ForecastDay;
  onOpen: () => void;
}) {
  const summary = polishProse(day.summary);
  const rainHint = day.rainHint ? polishProse(day.rainHint) : null;
  const kind = weatherKindFromText(rainHint, day.skyHint, summary, day.windHint);
  const meta = weatherMeta(kind);
  const tip = shortPrecip(rainHint) ?? day.skyHint ?? meta.label;

  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={onOpen}
        className="flex h-full w-full min-w-0 flex-col rounded-xl border border-slate-700/50 bg-slate-950/40 p-3 text-left transition-colors active:bg-slate-800/50"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="whitespace-nowrap text-[15px] leading-snug font-semibold text-slate-100">
              {polishProse(day.label)}
            </h3>
            {day.dateHint && (
              <p className="mt-0.5 text-xs font-medium tabular-nums text-slate-500">
                {day.dateHint}
              </p>
            )}
          </div>
          <WeatherGlyph kind={kind} size="sm" className="shrink-0" />
        </div>

        <TempChip
          className="mt-3"
          minTempC={day.minTempC}
          maxTempC={day.maxTempC}
          tempTrend={day.tempTrend}
        />

        <p className="mt-2 line-clamp-2 text-[12px] leading-snug text-slate-400">{tip}</p>
        <p className="mt-auto pt-2 text-[11px] font-medium text-slate-500">
          Detalhe <ChevronRight className="ml-0.5 inline size-3" />
        </p>
      </button>
    </li>
  );
}

function DayDetail({
  day,
  kind,
}: {
  day: ForecastDay;
  kind: WeatherKind;
}) {
  const meta = weatherMeta(kind);
  const summary = polishProse(day.summary);
  const rainHint = day.rainHint ? polishProse(day.rainHint) : null;
  const windHint = day.windHint ? polishProse(day.windHint) : null;

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <WeatherGlyph kind={kind} size="lg" />
        <div className="min-w-0">
          <p className="font-semibold text-slate-100">{meta.label}</p>
          {day.skyHint && <p className="mt-0.5 text-sm text-slate-400">{day.skyHint}</p>}
        </div>
      </div>

      <TempChip
        minTempC={day.minTempC}
        maxTempC={day.maxTempC}
        tempTrend={day.tempTrend}
      />

      {(rainHint || windHint) && (
        <p className="mt-4 text-sm font-medium text-brand-400">
          {[rainHint, windHint].filter(Boolean).join(" · ")}
        </p>
      )}

      <p className="mt-4 text-[15px] leading-relaxed text-slate-300">{summary}</p>
    </>
  );
}

/** Próximos dias — cards resumidos; toque abre detalhe. */
export function ForecastDaysPanel({
  forecast,
  className,
}: {
  forecast: ForecastBulletin | null;
  className?: string;
}) {
  const [selected, setSelected] = useState<ForecastDay | null>(null);

  if (!forecast?.days.length) {
    return (
      <section id="dias" className={cn("section-anchor glass rounded-xl p-4", className)}>
        <h2 className="page-title text-slate-100">Próximos dias</h2>
        <p className="mt-3 text-sm text-slate-400">
          {forecast ? "Sem previsão multi-dias no boletim atual." : "Carregando próximos dias…"}
        </p>
      </section>
    );
  }

  const selectedKind = selected
    ? weatherKindFromText(
        selected.rainHint,
        selected.skyHint,
        selected.summary,
        selected.windHint,
      )
    : null;

  return (
    <>
      <section id="dias" className={cn("section-anchor glass overflow-hidden rounded-xl p-4", className)}>
        <div className="border-b border-slate-700/50 pb-3">
          <h2 className="page-title text-slate-100">Próximos dias</h2>
          <p className="mt-1 text-[13px] text-slate-400">Toque no dia para ver o detalhe</p>
        </div>

        <div className="-mx-4 mt-3 overflow-x-auto overscroll-x-contain px-4 pb-1">
          <ul
            className="grid gap-2.5"
            style={{
              gridTemplateColumns: `repeat(${forecast.days.length}, minmax(11.75rem, 1fr))`,
            }}
          >
            {forecast.days.map((day) => (
              <DayCard
                key={`${day.label}-${day.dateHint}`}
                day={day}
                onOpen={() => setSelected(day)}
              />
            ))}
          </ul>
        </div>
      </section>

      {selected && selectedKind && (
        <DetailSheet
          open
          title={polishProse(selected.label)}
          subtitle={selected.dateHint}
          onClose={() => setSelected(null)}
        >
          <DayDetail day={selected} kind={selectedKind} />
        </DetailSheet>
      )}
    </>
  );
}
