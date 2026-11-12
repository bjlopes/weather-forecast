"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowDownRight, ArrowRight, ArrowUpRight, ChevronRight, X } from "lucide-react";
import type {
  ForecastBulletin,
  ForecastDay,
  ForecastPeriod,
  TempTrend,
} from "@/lib/alerta-rio/forecast-types";
import { polishProse } from "@/lib/alerta-rio/forecast-parse";
import {
  forecastZoneForLatLon,
  pickActivePeriod,
  pickZoneTemp,
  upcomingPeriods,
} from "@/lib/alerta-rio/forecast-zone";
import {
  weatherKindFromText,
  weatherMeta,
  WeatherGlyph,
  type WeatherKind,
} from "@/lib/alerta-rio/weather-icon";
import type { UserLocation } from "@/hooks/use-user-location";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

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
    .split(/\s+(?:durante|a partir|entre|no período|pela|pela manhã|à tarde|a qualquer)\b/i)[0]
    .trim()
    .replace(/[.,;:\s]+$/, "");
  return base || null;
}

/** Temperaturas + tendência — tendência sempre em linha própria nos cards. */
function TempChip({
  minTempC,
  maxTempC,
  tempTrend,
  className,
  stacked = false,
}: {
  minTempC: number | null;
  maxTempC: number | null;
  tempTrend?: TempTrend | null;
  className?: string;
  /** Nos cards estreitos, tendência fica abaixo das temps. */
  stacked?: boolean;
}) {
  if (minTempC == null && maxTempC == null && !tempTrend) return null;
  const trend = tempTrend ? TREND_UI[tempTrend] : null;
  const TrendIcon = trend?.Icon;

  const temps = (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5 tabular-nums">
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
    </div>
  );

  const trendEl =
    trend && TrendIcon ? (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[12px] font-semibold whitespace-nowrap",
          trend.className,
        )}
      >
        <TrendIcon className="size-3.5 shrink-0" />
        {trend.label}
      </span>
    ) : null;

  return (
    <div
      className={cn(
        stacked ? "flex flex-col items-start gap-1" : "flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1",
        className,
      )}
    >
      {temps}
      {trendEl}
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

  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
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
      <div className="sheet-panel relative z-10 my-auto max-h-[min(78dvh,40rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-700/50 bg-slate-900 px-5 py-4 shadow-xl">
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
    </div>,
    document.body,
  );
}

function periodSummary(period: ForecastPeriod): string {
  const text = polishProse(
    [
      period.sky ? `Céu ${period.sky.toLowerCase()}` : null,
      period.precip,
      period.wind ? `Ventos ${period.wind.toLowerCase()}` : null,
    ]
      .filter(Boolean)
      .join(". "),
  );
  return text || "Detalhe do período ainda não publicado no boletim 24h.";
}

/** Completa período sem colunas no 24h com o resumo do dia (Estendida). */
function enrichPeriodFromDays(
  period: ForecastPeriod,
  days: ForecastDay[] | undefined,
): ForecastPeriod {
  if (period.sky || period.precip || period.wind) return period;
  if (!days?.length || !period.dateHint) return period;
  const day = days.find((d) => d.dateHint === period.dateHint);
  if (!day) return period;
  return {
    ...period,
    sky: day.skyHint,
    precip: day.rainHint,
    wind: day.windHint,
    tempTrend: period.tempTrend ?? day.tempTrend,
  };
}

/** Sinótica sempre completa; destaca o período atual do boletim 24h. */
export function ForecastTodayPanel({
  forecast,
  userLocation = null,
  className,
}: {
  forecast: ForecastBulletin | null;
  userLocation?: UserLocation | null;
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

  const periods = forecast.periods ?? [];
  const activePeriod = pickActivePeriod(periods);
  const nextPeriods = upcomingPeriods(periods, activePeriod).map((period) =>
    enrichPeriodFromDays(period as ForecastPeriod, forecast.days),
  );

  const preferredZone = userLocation
    ? forecastZoneForLatLon(userLocation.lat, userLocation.lon)
    : null;
  const zoneTemp = pickZoneTemp(forecast.zoneTemps, preferredZone);
  const minTempC = zoneTemp?.minTempC ?? forecast.minTempC;
  const maxTempC = zoneTemp?.maxTempC ?? forecast.maxTempC;
  const tempTrend = activePeriod?.tempTrend ?? forecast.tempTrend;

  const title = polishProse(forecast.title);
  const synoptic = polishProse(forecast.synoptic);
  const detail24h = polishProse(forecast.detail24h);
  const periodText = activePeriod ? periodSummary(activePeriod) : detail24h;
  const todayKind = weatherKindFromText(
    activePeriod?.precip,
    activePeriod?.sky,
    periodText,
    title,
  );
  const todayMeta = weatherMeta(todayKind);
  const fromAlerta =
    forecast.source === "live" && /alertario\.rio/i.test(forecast.sourceUrl);
  const fromEstendida = fromAlerta && /4-dias/i.test(forecast.sourceUrl);
  const sourceLabel =
    forecast.source === "sample"
      ? "Amostra"
      : fromEstendida
        ? "Alerta Rio · estendida"
        : fromAlerta
          ? "Alerta Rio · 24h"
          : "Boletim COR";
  const sourceHrefLabel = fromAlerta ? "Fonte oficial Alerta Rio" : "Fonte oficial COR";

  return (
    <>
      <section id="hoje" className={cn("section-anchor glass overflow-hidden rounded-xl p-4 sm:p-5", className)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="page-title text-slate-100">Hoje</h2>
            <p className="mt-1 text-[12px] text-slate-500 sm:text-[13px]">
              {sourceLabel}
              {" · "}
              {formatPublished(forecast.publishedAt)}
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
          minTempC={minTempC}
          maxTempC={maxTempC}
          tempTrend={tempTrend}
        />
        {zoneTemp && (
          <p className="mt-1 text-[12px] text-slate-500">
            {zoneTemp.zone}
            {preferredZone ? "" : " · referência"}
          </p>
        )}

        {activePeriod ? (
          <div className="mt-4">
            <h3 className="text-[17px] font-semibold tracking-tight text-slate-100">
              {activePeriod.label}
              {activePeriod.dateHint ? (
                <span className="ml-2 text-[13px] font-normal text-slate-500">
                  {activePeriod.dateHint}
                </span>
              ) : null}
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-200">{periodText}</p>
          </div>
        ) : (
          <h3 className="mt-3 text-[15px] leading-snug font-medium text-slate-200">{title}</h3>
        )}

        {synoptic && (
          <div className="mt-5">
            <p className="text-[11px] font-medium tracking-wide text-brand-400 uppercase">
              Previsão sinótica
            </p>
            <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-wrap text-slate-300">
              {synoptic}
            </p>
          </div>
        )}

        {(nextPeriods.length > 0 || detail24h) && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-4 flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-slate-700/50 bg-slate-950/40 px-3 text-left text-sm font-medium text-slate-300 transition-colors active:bg-slate-800/50"
          >
            <span>Próximas 24 horas</span>
            <ChevronRight className="size-4 shrink-0 text-slate-500" aria-hidden />
          </button>
        )}

        <a
          href={forecast.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-brand-400"
        >
          {sourceHrefLabel}
        </a>
      </section>

      <DetailSheet
        open={open}
        title="Próximas 24 horas"
        subtitle={
          activePeriod
            ? `Depois de ${activePeriod.label.toLowerCase()} · ${sourceLabel}`
            : `${sourceLabel} · ${formatPublished(forecast.publishedAt)}`
        }
        onClose={() => setOpen(false)}
      >
        {nextPeriods.length ? (
          <ul className="space-y-4">
            {nextPeriods.map((period) => {
              const text = periodSummary(period);
              const kind = weatherKindFromText(period.precip, period.sky, text);
              const meta = weatherMeta(kind);
              return (
                <li
                  key={`${period.name}-${period.date ?? period.dateHint ?? ""}`}
                  className="rounded-xl border border-slate-700/50 bg-slate-950/40 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-100">
                        {period.label}
                        {period.dateHint ? (
                          <span className="ml-1.5 text-[12px] font-normal text-slate-500">
                            {period.dateHint}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-[13px] text-slate-400">{meta.label}</p>
                    </div>
                    <WeatherGlyph kind={kind} size="sm" />
                  </div>
                  <p className="mt-2 text-[14px] leading-relaxed text-slate-300">{text}</p>
                </li>
              );
            })}
          </ul>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-3">
              <WeatherGlyph kind={todayKind} size="lg" />
              <div className="min-w-0">
                <p className="font-semibold text-slate-100">{todayMeta.label}</p>
                <TempChip
                  className="mt-1"
                  minTempC={minTempC}
                  maxTempC={maxTempC}
                  tempTrend={tempTrend}
                />
              </div>
            </div>
            <p className="text-[15px] leading-relaxed text-slate-300">{detail24h}</p>
          </>
        )}

        {forecast.zoneTemps && forecast.zoneTemps.length > 0 && (
          <div className="mt-5 border-t border-slate-700/50 pt-4">
            <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
              Temperaturas por região
            </p>
            <ul className="mt-2 space-y-1.5">
              {forecast.zoneTemps.map((z) => (
                <li
                  key={z.zone}
                  className={cn(
                    "flex items-center justify-between gap-3 text-sm",
                    zoneTemp?.zone === z.zone ? "text-brand-400" : "text-slate-300",
                  )}
                >
                  <span>{z.zone}</span>
                  <span className="tabular-nums">
                    {z.minTempC != null ? `${z.minTempC}°` : "—"}
                    {" / "}
                    {z.maxTempC != null ? `${z.maxTempC}°` : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
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
  const skyHint = day.skyHint ? polishProse(day.skyHint) : null;
  const kind = weatherKindFromText(rainHint, skyHint, summary, day.windHint);
  const meta = weatherMeta(kind);
  const tip = shortPrecip(rainHint) ?? skyHint ?? meta.label;
  // "Segunda-feira" → "Segunda" para caber sem reticências
  const shortLabel = polishProse(day.label)
    .replace(/-feira$/i, "")
    .trim();

  return (
    <li className="min-w-0 snap-start">
      <button
        type="button"
        onClick={onOpen}
        className="flex h-full w-full min-w-0 flex-col rounded-xl border border-slate-700/50 bg-slate-950/40 p-3 text-left transition-colors active:bg-slate-800/50"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] leading-snug font-semibold text-slate-100">
              {shortLabel}
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
          stacked
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
  const skyHint = day.skyHint ? polishProse(day.skyHint) : null;
  const rainHint = day.rainHint ? polishProse(day.rainHint) : null;
  const windHint = day.windHint ? polishProse(day.windHint) : null;
  const corDetail = day.corDetail ? polishProse(day.corDetail) : null;

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <WeatherGlyph kind={kind} size="lg" />
        <div className="min-w-0">
          <p className="font-semibold text-slate-100">{meta.label}</p>
          {skyHint && <p className="mt-0.5 text-sm text-slate-400">{skyHint}</p>}
        </div>
      </div>

      <TempChip
        stacked
        minTempC={day.minTempC}
        maxTempC={day.maxTempC}
        tempTrend={day.tempTrend}
      />

      <div className="mt-5 space-y-3">
        {rainHint && (
          <div>
            <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
              Chuva
            </p>
            <p className="mt-1 text-[15px] leading-snug text-slate-200">{rainHint}</p>
          </div>
        )}
        {windHint && (
          <div>
            <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
              Vento
            </p>
            <p className="mt-1 text-[15px] leading-snug text-slate-200">{windHint}</p>
          </div>
        )}
      </div>

      {corDetail && (
        <div className="mt-5 border-t border-slate-700/50 pt-5">
          <p className="text-[11px] font-medium tracking-wide text-brand-400 uppercase">
            Boletim COR
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-300">{corDetail}</p>
        </div>
      )}
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
          <p className="mt-1 text-[13px] text-slate-400">
            {forecast.daysSource === "cor"
              ? "Boletim COR · próximos dias · toque para detalhe"
              : forecast.daysSource === "sample"
                ? "Amostra · toque para detalhe"
                : "Estendida Alerta Rio · 4 dias · toque para detalhe"}
          </p>
        </div>

        <div className="-mx-4 mt-3 overflow-x-auto overscroll-x-contain px-4 pb-1">
          <ul
            className="grid snap-x snap-mandatory gap-2.5"
            style={{
              gridTemplateColumns: `repeat(${forecast.days.length}, minmax(9.5rem, 1fr))`,
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
