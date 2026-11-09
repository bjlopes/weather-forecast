export type StationNetwork = "alerta_rio" | "inmet" | "cemaden" | "metar";

export type StationHealth = "ativa" | "atrasada" | "parada" | "desconhecida";

export interface UnifiedStation {
  id: string;
  network: StationNetwork;
  networkLabel: string;
  name: string;
  subtitle: string;
  lat: number | null;
  lon: number | null;
  readAt: string | null;
  readAtIso: string | null;
  health: StationHealth;
  healthLabel: string;
  rainMmH1: number | null;
  rainMmH24: number | null;
  rainMmM15: number | null;
  temperatureC: number | null;
  humidityPct: number | null;
  windSpeedKmh: number | null;
  weatherText: string | null;
  raining: boolean | null;
  /** Detalhe extra (METAR bruto, etc.) */
  detail: string | null;
  /** ID numérico Alerta Rio, se aplicável */
  alertaId?: number;
}

export interface StationsSnapshot {
  fetchedAt: string;
  stations: UnifiedStation[];
  counts: Record<StationNetwork | "total", number>;
}
