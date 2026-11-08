"use client";

import { CalendarDays, CloudSun, Thermometer } from "lucide-react";
import type { ForecastBulletin } from "@/lib/alerta-rio/forecast-types";
import { cn } from "@/lib/utils";

function formatHour(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(iso));
  } catch {
    return iso.slice(11, 16);
  }
}

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

export function ForecastPanel({
  forecast,
  className,
}: {
  forecast: ForecastBulletin | null;
  className?: string;
}) {
  if (!forecast) {
    return (
      <section className={cn("mt-8", className)} aria-busy="true">
        <p className="text-sm text-[oklch(0.45_0.03_230)]">Carregando previsão do Alerta Rio…</p>
      </section>
    );
  }

  return (
    <section id="previsao" className={cn("mt-8 scroll-mt-[calc(1rem+env(safe-area-inset-top))] sm:mt-10", className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl text-[oklch(0.25_0.05_230)]">Previsão</h2>
          <p className="mt-1 text-sm text-[oklch(0.45_0.03_230)]">
            Boletim Alerta Rio / COR · atualizado {formatPublished(forecast.publishedAt)}
          </p>
        </div>
        <a
          href={forecast.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-[oklch(0.35_0.05_230)] underline-offset-2 hover:underline"
        >
          Fonte oficial
        </a>
      </div>

      {forecast.source === "sample" && (
        <p className="mt-2 text-xs text-[oklch(0.5_0.02_230)]">
          Exibindo amostra do boletim (fonte ao vivo indisponível neste momento).
        </p>
      )}

      <div className="mt-4 space-y-3">
        <article className="rounded-2xl border border-white/70 bg-white/60 p-4 backdrop-blur-md sm:p-5">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-[oklch(0.45_0.04_230)] uppercase">
            <CloudSun className="size-3.5" />
            Previsão sinótica
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[oklch(0.3_0.04_230)] sm:text-[0.95rem]">
            {forecast.synoptic}
          </p>
        </article>

        <article className="rounded-2xl border border-white/70 bg-white/65 p-4 backdrop-blur-md sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-[oklch(0.45_0.04_230)] uppercase">
                <Thermometer className="size-3.5" />
                Próximas 24 horas
              </p>
              <h3 className="font-display mt-1 text-lg text-[oklch(0.24_0.05_230)] sm:text-xl">
                {forecast.title}
              </h3>
            </div>
            {(forecast.minTempC != null || forecast.maxTempC != null) && (
              <div className="flex gap-2">
                {forecast.minTempC != null && (
                  <span className="rounded-md bg-[oklch(0.93_0.03_220)] px-2.5 py-1 text-sm font-semibold tabular-nums text-[oklch(0.32_0.05_230)]">
                    {forecast.minTempC}°
                    <span className="ml-1 text-[10px] font-medium tracking-wide uppercase opacity-70">mín</span>
                  </span>
                )}
                {forecast.maxTempC != null && (
                  <span className="rounded-md bg-[oklch(0.92_0.05_70)] px-2.5 py-1 text-sm font-semibold tabular-nums text-[oklch(0.35_0.08_55)]">
                    {forecast.maxTempC}°
                    <span className="ml-1 text-[10px] font-medium tracking-wide uppercase opacity-70">máx</span>
                  </span>
                )}
              </div>
            )}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[oklch(0.32_0.03_230)]">
            {forecast.detail24h}
          </p>

          {forecast.hourly && forecast.hourly.hours.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-[oklch(0.48_0.03_230)]">
                Detalhe horário · município do Rio
                {forecast.hourly.source === "sample" ? " (amostra)" : ""}
              </p>
              <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
                {forecast.hourly.hours.map((h) => (
                  <div
                    key={h.time}
                    className="min-w-[4.25rem] shrink-0 rounded-xl bg-[oklch(0.96_0.015_220)] px-2.5 py-2.5 text-center"
                  >
                    <p className="text-[11px] font-medium text-[oklch(0.48_0.03_230)]">
                      {formatHour(h.time)}
                    </p>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-[oklch(0.28_0.05_230)]">
                      {Math.round(h.temperatureC)}°
                    </p>
                    <p className="mt-0.5 text-[10px] tabular-nums text-[oklch(0.45_0.04_220)]">
                      {h.precipMm > 0
                        ? `${h.precipMm.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mm`
                        : h.precipProb != null
                          ? `${h.precipProb}%`
                          : "—"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>

        {forecast.days.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-[oklch(0.45_0.04_230)] uppercase">
              <CalendarDays className="size-3.5" />
              Próximos dias
            </p>
            <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 lg:grid lg:grid-cols-3 lg:overflow-visible">
              {forecast.days.map((day) => (
                <article
                  key={`${day.label}-${day.dateHint}`}
                  className="min-w-[16rem] shrink-0 rounded-2xl border border-white/70 bg-white/60 p-4 backdrop-blur-md lg:min-w-0"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-display text-lg text-[oklch(0.25_0.05_230)]">{day.label}</h3>
                    {day.dateHint && (
                      <span className="text-xs tabular-nums text-[oklch(0.5_0.02_230)]">{day.dateHint}</span>
                    )}
                  </div>
                  {(day.rainHint || day.windHint) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {day.rainHint && (
                        <span className="rounded bg-[oklch(0.92_0.03_210)] px-2 py-0.5 text-[11px] font-medium text-[oklch(0.35_0.05_210)]">
                          {day.rainHint}
                        </span>
                      )}
                      {day.windHint && (
                        <span className="rounded bg-[oklch(0.94_0.02_85)] px-2 py-0.5 text-[11px] font-medium text-[oklch(0.4_0.05_70)]">
                          {day.windHint}
                        </span>
                      )}
                    </div>
                  )}
                  <p className="mt-2 text-sm leading-relaxed text-[oklch(0.35_0.03_230)]">{day.summary}</p>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
