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
  /** Tendência das temperaturas no boletim (declínio / estável / elevação). */
  tempTrend: TempTrend | null;
  /** Frase curta para UI, ex.: "Acentuado declínio". */
  tempTrendLabel: string | null;
  days: ForecastDay[];
  /** Origem dos cards de próximos dias (debug / UI). */
  daysSource?: "estendida" | "cor" | "sample";
}
