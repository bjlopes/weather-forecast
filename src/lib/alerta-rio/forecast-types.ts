import type { HourlyForecast } from "./hourly-fetch";

export interface ForecastDay {
  label: string;
  dateHint: string | null;
  summary: string;
  rainHint: string | null;
  windHint: string | null;
}

export interface ForecastBulletin {
  fetchedAt: string;
  source: "live" | "sample";
  sourceUrl: string;
  title: string;
  publishedAt: string;
  /** Análise sinótica (sistemas meteorológicos). */
  synoptic: string;
  /** Previsão detalhada para as próximas ~24h. */
  detail24h: string;
  minTempC: number | null;
  maxTempC: number | null;
  days: ForecastDay[];
  /** Previsão horária (modelo) para as próximas 24h no município. */
  hourly?: HourlyForecast;
}
