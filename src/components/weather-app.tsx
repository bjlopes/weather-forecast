"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { CitySearch } from "@/components/city-search";
import { CurrentWeather } from "@/components/current-weather";
import { Forecast } from "@/components/forecast";
import {
  fetchWeather,
  type CityResult,
  type WeatherBundle,
} from "@/lib/weather";
import type { WeatherTone } from "@/lib/weather-codes";
import { cn } from "@/lib/utils";

const DEFAULT_TONE: WeatherTone = "clear";

export function WeatherApp() {
  const [weather, setWeather] = useState<WeatherBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const tone = weather?.current.tone ?? DEFAULT_TONE;

  function handleSelect(city: CityResult) {
    setError(null);
    startTransition(async () => {
      try {
        const bundle = await fetchWeather(city);
        setWeather(bundle);
      } catch {
        setError("Could not load weather for that city.");
      }
    });
  }

  return (
    <div
      data-tone={tone}
      className={cn(
        "sky-shell relative flex min-h-full flex-1 flex-col overflow-hidden",
        weather ? "has-weather" : "is-idle"
      )}
    >
      <div className="sky-orb sky-orb-a" aria-hidden />
      <div className="sky-orb sky-orb-b" aria-hidden />
      <div className="sky-grain" aria-hidden />

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 pt-8 sm:px-10">
        <p className="font-display text-xl font-semibold tracking-tight text-[color:var(--ink)]">
          Brisa
        </p>
        <p className="text-xs tracking-[0.16em] text-[color:var(--ink-soft)] uppercase">
          Open-Meteo
        </p>
      </header>

      <main className="relative z-10 flex flex-1 flex-col">
        <section
          className={cn(
            "mx-auto flex w-full max-w-5xl flex-col px-6 sm:px-10",
            weather ? "pt-8 pb-6" : "min-h-[72vh] justify-center py-16"
          )}
        >
          {!weather ? (
            <>
              <p className="font-display animate-fade text-[clamp(3.4rem,10vw,7.5rem)] leading-[0.9] font-semibold tracking-tight text-[color:var(--ink)]">
                Brisa
              </p>
              <h1 className="animate-fade-delay mt-5 max-w-xl text-2xl leading-snug text-[color:var(--ink)] sm:text-3xl">
                Feel the sky before you step outside.
              </h1>
              <p className="animate-fade-delay mt-3 max-w-lg text-base text-[color:var(--ink-soft)] sm:text-lg">
                Search any city for live conditions and a clear five-day outlook.
              </p>
            </>
          ) : (
            <h1 className="sr-only">Weather for your city</h1>
          )}

          <div className={cn("animate-fade-delay-2", weather ? "mt-2" : "mt-10")}>
            <CitySearch onSelect={handleSelect} disabled={isPending} />
          </div>

          {isPending ? (
            <p className="mt-5 flex items-center gap-2 text-sm text-[color:var(--ink-soft)]">
              <Loader2 className="size-4 animate-spin" />
              Reading the sky…
            </p>
          ) : null}
          {error ? (
            <p className="mt-5 text-sm text-[color:var(--danger)]" role="alert">
              {error}
            </p>
          ) : null}
        </section>

        {weather ? (
          <>
            <CurrentWeather weather={weather} />
            <Forecast weather={weather} />
          </>
        ) : null}
      </main>

      <footer className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-8 text-xs text-[color:var(--ink-soft)] sm:px-10">
        Weather data by{" "}
        <a
          href="https://open-meteo.com/"
          className="underline decoration-white/30 underline-offset-2 hover:decoration-white/70"
          target="_blank"
          rel="noreferrer"
        >
          Open-Meteo
        </a>
        . No API key required.
      </footer>
    </div>
  );
}
