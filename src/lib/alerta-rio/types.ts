export type RainIntensity =
  | "seca"
  | "fraca"
  | "moderada"
  | "forte"
  | "muito_forte";

export type ZoneName =
  | "Zona Sul"
  | "Baía de Guanabara"
  | "Barra/Jacarepaguá"
  | "Baía de Sepetiba";

export interface RainStation {
  id: number;
  name: string;
  zone: ZoneName;
  readAt: string;
  rainMm: {
    m05: number | null;
    m10: number | null;
    m15: number | null;
    m30: number | null;
    h1: number | null;
    h2: number | null;
    h3: number | null;
    h4: number | null;
    h6: number | null;
    h12: number | null;
    h24: number | null;
    h96: number | null;
    month: number | null;
  };
}

export interface MeteoStation {
  id: number;
  name: string;
  readAt: string;
  temperatureC: number | null;
  humidityPct: number | null;
  pressureHpa: number | null;
  dewPointC: number | null;
  windSpeedKmh: number | null;
  windDirDeg: number | null;
}

export interface ZoneStatus {
  zone: ZoneName;
  rainStage: string;
  landslideRisk: string;
}

export interface AlertaRioSnapshot {
  fetchedAt: string;
  source: "live" | "sample";
  sourceUrl: string;
  rainStations: RainStation[];
  meteoStations: MeteoStation[];
  zones: ZoneStatus[];
}
