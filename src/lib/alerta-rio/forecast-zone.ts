import { STATION_COORDS, distanceKm } from "./station-coords";
import { STATION_ZONES } from "./zones";

/** Zonas de temperatura do boletim Previsao.html (24h). */
export type ForecastTempZone =
  | "Barra/Jacarepaguá"
  | "Centro/Grande Tijuca"
  | "Zona Norte"
  | "Zona Oeste"
  | "Zona Sul";

export const FORECAST_TEMP_ZONES: readonly ForecastTempZone[] = [
  "Barra/Jacarepaguá",
  "Centro/Grande Tijuca",
  "Zona Norte",
  "Zona Oeste",
  "Zona Sul",
] as const;

const DEFAULT_ZONE: ForecastTempZone = "Centro/Grande Tijuca";

function stationZoneToForecastZone(stationZone: string): ForecastTempZone {
  if (stationZone === "Zona Sul") return "Zona Sul";
  if (stationZone === "Barra/Jacarepaguá") return "Barra/Jacarepaguá";
  if (stationZone === "Baía de Sepetiba") return "Zona Oeste";
  // Baía de Guanabara cobre Centro, Tijuca e Norte — desambiguamos por lat.
  return "Centro/Grande Tijuca";
}

/** Escolhe a zona de temperatura do boletim 24h a partir da localização. */
export function forecastZoneForLatLon(lat: number, lon: number): ForecastTempZone {
  let bestId: number | null = null;
  let bestKm = Number.POSITIVE_INFINITY;
  for (const c of STATION_COORDS) {
    const km = distanceKm(lat, lon, c.lat, c.lon);
    if (km < bestKm) {
      bestKm = km;
      bestId = c.id;
    }
  }
  if (bestId == null) return DEFAULT_ZONE;

  const stationZone = STATION_ZONES[bestId];
  if (!stationZone) return DEFAULT_ZONE;
  if (stationZone === "Baía de Guanabara") {
    // Norte da cidade vs centro/Tijuca
    return lat > -22.88 ? "Zona Norte" : "Centro/Grande Tijuca";
  }
  return stationZoneToForecastZone(stationZone);
}

export type DayPeriodName = "madrugada" | "manhã" | "tarde" | "noite";

export const DAY_PERIOD_LABEL: Record<DayPeriodName, string> = {
  madrugada: "Madrugada",
  manhã: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
};

/** Período do boletim 24h conforme horário em America/Sao_Paulo. */
export function currentDayPeriod(now = new Date()): DayPeriodName {
  let hour = 12;
  try {
    hour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Sao_Paulo",
        hour: "numeric",
        hour12: false,
      }).format(now),
    );
  } catch {
    hour = now.getUTCHours() - 3;
  }
  if (hour >= 0 && hour < 6) return "madrugada";
  if (hour < 12) return "manhã";
  if (hour < 18) return "tarde";
  return "noite";
}

export function pickZoneTemp<T extends { zone: string }>(
  zones: T[] | undefined,
  preferred: ForecastTempZone | null,
): T | null {
  if (!zones?.length) return null;
  if (preferred) {
    const hit = zones.find((z) => z.zone.toLowerCase() === preferred.toLowerCase());
    if (hit) return hit;
  }
  const centro = zones.find((z) => /centro|tijuca/i.test(z.zone));
  return centro ?? zones[0] ?? null;
}

function rioDayKey(now = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/**
 * Escolhe o período do boletim 24h alinhado ao horário atual.
 * O HTML do Alerta Rio é rolante (ex.: Manhã→Tarde→Noite→Madrugada do dia seguinte),
 * então prioriza o período de hoje; se já saiu da tabela, usa a 1ª coluna.
 */
export function pickActivePeriod<T extends { name: DayPeriodName; date?: string | null }>(
  periods: T[] | undefined,
  now = new Date(),
): T | null {
  if (!periods?.length) return null;
  const want = currentDayPeriod(now);
  const today = rioDayKey(now);
  const exactToday = periods.find((p) => p.name === want && p.date === today);
  if (exactToday) return exactToday;
  const sameName = periods.find((p) => p.name === want && !p.date);
  if (sameName) return sameName;
  return periods[0] ?? null;
}
