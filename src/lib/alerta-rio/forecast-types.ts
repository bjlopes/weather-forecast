import type { DayPeriodName, ForecastTempZone } from "./forecast-zone";

export type TempTrend = "declinio" | "estavel" | "elevacao";

export interface ForecastDay {
  label: string;
  dateHint: string | null;
  summary: string;
  rainHint: string | null;
  windHint: string | null;
  minTempC: number | null;
  maxTempC: number | null;
  tempTrend: TempTrend | null;
  /** Reservado; UI usa Lucide via weatherKindFromText (sem GIFs Alerta Rio). */
  iconUrl: string | null;
  skyHint: string | null;
  /** Texto completo do boletim COR para este dia, se houver. */
  corDetail: string | null;
}

export interface ForecastPeriod {
  name: DayPeriodName;
  label: string;
  /** Data do período no boletim (YYYY-MM-DD), quando o HTML traz. */
  date?: string | null;
  /** Ex.: 12/11 — para UI. */
  dateHint?: string | null;
  sky: string | null;
  precip: string | null;
  wind: string | null;
  tempTrend: TempTrend | null;
  tempTrendLabel: string | null;
}

export interface ForecastZoneTemp {
  zone: ForecastTempZone | string;
  minTempC: number | null;
  maxTempC: number | null;
}

export interface ForecastBulletin {
  fetchedAt: string;
  source: "live" | "sample";
  sourceUrl: string;
  title: string;
  publishedAt: string;
  /** Análise sinótica (sistemas meteorológicos). */
  synoptic: string;
  /** Previsão detalhada para as próximas ~24h (todos os períodos). */
  detail24h: string;
  minTempC: number | null;
  maxTempC: number | null;
  /** Tendência das temperaturas no boletim (declínio / estável / elevação). */
  tempTrend: TempTrend | null;
  /** Frase curta para UI, ex.: "Acentuado declínio". */
  tempTrendLabel: string | null;
  days: ForecastDay[];
  /** Origem dos cards de próximos dias (debug / UI). */
  daysSource?: "estendida" | "cor" | "sample";
  /** Períodos do boletim Alerta Rio 24h (madrugada→noite). */
  periods?: ForecastPeriod[];
  /** Temperaturas mín/máx por zona do boletim 24h. */
  zoneTemps?: ForecastZoneTemp[];
}
