"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import type { ForecastBulletin, TempTrend } from "@/lib/alerta-rio/forecast-types";
import { polishProse } from "@/lib/alerta-rio/forecast-parse";
import {
  weatherKindFromText,
  weatherMeta,
  WeatherGlyph,
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

function ForecastMeta({ forecast }: { forecast: ForecastBulletin }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-slate-400">
        Boletim COR · {formatPublished(forecast.publishedAt)}
      </p>
      <a
        href={forecast.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="text-xs font-medium text-brand-400 hover:text-brand-300 hover:underline"
      >
        Fonte oficial
      </a>
    </div>
  );
}

const TREND_UI: Record<
  TempTrend,
  { label: string; className: string; Icon: typeof ArrowDownRight }
> = {
  declinio: {
    label: "Declínio",
    className: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    Icon: ArrowDownRight,
  },
  estavel: {
    label: "Estáveis",
    className: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    Icon: ArrowRight,
  },
  elevacao: {
    label: "Elevação",
    className: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    Icon: ArrowUpRight,
  },
};

function TempSummary({
  minTempC,
  maxTempC,
  tempTrend,
  tempTrendLabel,
  compact,
}: {
  minTempC: number | null;
  maxTempC: number | null;
  tempTrend: TempTrend | null;
  tempTrendLabel?: string | null;
  compact?: boolean;
}) {
  if (minTempC == null && maxTempC == null && !tempTrend) return null;
  const trend = tempTrend ? TREND_UI[tempTrend] : null;
  const TrendIcon = trend?.Icon;

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-700/50 bg-slate-950/50",
        compact ? "px-3 py-2.5" : "px-4 py-3",
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-baseline gap-4 tabular-nums">
          {minTempC != null && (
            <p className={cn("font-semibold text-slate-400", compact ? "text-xl" : "text-2xl")}>
              {minTempC}°
              <span className="ml-1 text-[10px] font-medium tracking-wide text-slate-500 uppercase">
                mín
              </span>
            </p>
          )}
          {maxTempC != null && (
            <p className={cn("font-bold text-brand-400", compact ? "text-2xl" : "text-4xl")}>
              {maxTempC}°
              <span className="ml-1 text-[10px] font-medium tracking-wide text-brand-400/70 uppercase">
                máx
              </span>
            </p>
          )}
          {minTempC == null && maxTempC == null && (
            <p className="text-sm font-medium text-slate-400">Temperatura</p>
          )}
        </div>
        {trend && TrendIcon && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium",
              trend.className,
            )}
          >
            <TrendIcon className="size-3.5 shrink-0" />
            {tempTrendLabel ?? trend.label}
          </span>
        )}
      </div>
    </div>
  );
}

/** Sinótica + previsão detalhada do dia / próximas 24h — bloco principal. */
export function ForecastTodayPanel({
  forecast,
  className,
}: {
  forecast: ForecastBulletin | null;
  className?: string;
}) {
  if (!forecast) {
    return (
      <section id="hoje" className={cn("section-anchor glass rounded-xl p-5", className)} aria-busy="true">
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
    <section id="hoje" className={cn("section-anchor glass rounded-xl p-5 sm:p-6", className)}>
      <div className="flex items-start justify-between gap-3 border-b border-slate-700/50 pb-3">
        <div className="min-w-0">
          <h2 className="page-title text-slate-100">Hoje</h2>
          <div className="mt-1.5">
            <ForecastMeta forecast={forecast} />
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1 rounded-xl border border-slate-700/50 bg-slate-950/50 px-3 py-2">
          <WeatherGlyph kind={todayKind} size="lg" />
          <span className="text-[10px] font-medium tracking-wide text-slate-400 uppercase">
            {todayMeta.label}
          </span>
        </div>
      </div>

      {forecast.source === "sample" && (
        <p className="mt-3 text-xs text-slate-500">
          Amostra do boletim (fonte ao vivo indisponível).
        </p>
      )}

      <div className="mt-5 space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-brand-400">Sinótica</p>
          <p className="mt-2 max-w-3xl text-base leading-relaxed text-slate-200 sm:text-[1.05rem]">
            {synoptic}
          </p>
        </div>

        <div className="border-t border-slate-700/50 pt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Previsão detalhada · próximas 24 horas
          </p>
          <h3 className="mt-2 text-xl font-semibold leading-snug text-slate-100 sm:text-2xl">
            {title}
          </h3>

          <div className="mt-4">
            <TempSummary
              minTempC={forecast.minTempC}
              maxTempC={forecast.maxTempC}
              tempTrend={forecast.tempTrend}
              tempTrendLabel={forecast.tempTrendLabel}
            />
          </div>

          <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-300">
            {detail24h}
          </p>
        </div>
      </div>
    </section>
  );
}

/** Previsão detalhada dos próximos dias. */
export function ForecastDaysPanel({
  forecast,
  className,
}: {
  forecast: ForecastBulletin | null;
  className?: string;
}) {
  if (!forecast?.days.length) {
    return (
      <section id="dias" className={cn("section-anchor glass rounded-xl p-5", className)}>
        <h2 className="page-title text-slate-100">Próximos dias</h2>
        <p className="mt-3 text-sm text-slate-400">
          {forecast
            ? "Sem previsão multi-dias no boletim atual."
            : "Carregando próximos dias…"}
        </p>
      </section>
    );
  }

  return (
    <section id="dias" className={cn("section-anchor glass rounded-xl p-5", className)}>
      <div className="border-b border-slate-700/50 pb-3">
        <h2 className="page-title text-slate-100">Próximos dias</h2>
        <p className="mt-1 text-sm text-slate-400">
          Boletim COR · previsão estendida Alerta Rio
        </p>
      </div>

      <div className="-mx-1 mt-4 overflow-x-auto px-1 pb-1">
        <ul
          className="grid min-w-0 gap-3"
          style={{
            gridTemplateColumns: `repeat(${forecast.days.length}, minmax(11.5rem, 1fr))`,
          }}
        >
          {forecast.days.map((day) => {
            const summary = polishProse(day.summary);
            const rainHint = day.rainHint ? polishProse(day.rainHint) : null;
            const windHint = day.windHint ? polishProse(day.windHint) : null;
            const kind = weatherKindFromText(
              rainHint,
              day.skyHint,
              summary,
              windHint,
            );
            const meta = weatherMeta(kind);
            return (
              <li
                key={`${day.label}-${day.dateHint}`}
                className="flex min-h-full flex-col rounded-xl border border-slate-700/50 bg-slate-950/40 p-4"
              >
                <div className="flex items-start justify-between gap-2 border-b border-slate-700/50 pb-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold leading-snug text-slate-100">
                      {polishProse(day.label)}
                    </h3>
                    {day.dateHint && (
                      <p className="mt-1 text-xs font-medium tabular-nums text-slate-500">
                        {day.dateHint}
                      </p>
                    )}
                    {day.skyHint && (
                      <p className="mt-1 text-[11px] leading-snug text-slate-500">{day.skyHint}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-center gap-0.5">
                    {day.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={day.iconUrl}
                        alt={meta.label}
                        width={48}
                        height={48}
                        className="size-12 object-contain"
                      />
                    ) : (
                      <WeatherGlyph kind={kind} size="md" />
                    )}
                    <span className="max-w-[4.5rem] text-center text-[9px] leading-tight font-medium text-slate-500">
                      {meta.label}
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <TempSummary
                    minTempC={day.minTempC}
                    maxTempC={day.maxTempC}
                    tempTrend={day.tempTrend}
                    compact
                  />
                </div>
                {(rainHint || windHint) && (
                  <p className="mt-3 text-xs font-medium leading-snug text-brand-400">
                    {[rainHint, windHint].filter(Boolean).join(" · ")}
                  </p>
                )}
                <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-300">{summary}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
