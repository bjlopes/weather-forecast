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

/** Ordem cronológica no dia civil (madrugada → … → noite → madrugada do dia seguinte). */
export const DAY_PERIOD_ORDER: readonly DayPeriodName[] = [
  "madrugada",
  "manhã",
  "tarde",
  "noite",
] as const;

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

export function rioDayKey(now = new Date()): string {
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

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (![y, m, d].every((n) => Number.isFinite(n))) return iso;
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function dateHintFromIso(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${Number(m[3])}/${Number(m[2])}`;
}

export type PeriodSlot = {
  name: DayPeriodName;
  label: string;
  date: string;
  dateHint: string;
};

/** Avança um período na linha do tempo (noite → madrugada do dia seguinte). */
export function advancePeriodSlot(name: DayPeriodName, date: string): PeriodSlot {
  const idx = DAY_PERIOD_ORDER.indexOf(name);
  if (idx < 0 || idx === DAY_PERIOD_ORDER.length - 1) {
    const nextDate = addDaysIso(date, 1);
    return {
      name: "madrugada",
      label: DAY_PERIOD_LABEL.madrugada,
      date: nextDate,
      dateHint: dateHintFromIso(nextDate),
    };
  }
  const nextName = DAY_PERIOD_ORDER[idx + 1];
  return {
    name: nextName,
    label: DAY_PERIOD_LABEL[nextName],
    date,
    dateHint: dateHintFromIso(date),
  };
}

/**
 * Sempre os 3 períodos civis seguintes ao atual.
 * Ex.: tarde 12/11 → noite 12/11, madrugada 13/11, manhã 13/11.
 */
export function nextThreePeriodSlots(
  fromName: DayPeriodName,
  fromDate: string,
): PeriodSlot[] {
  const out: PeriodSlot[] = [];
  let name = fromName;
  let date = fromDate;
  for (let i = 0; i < 3; i++) {
    const next = advancePeriodSlot(name, date);
    out.push(next);
    name = next.name;
    date = next.date;
  }
  return out;
}

/**
 * Escolhe o período do boletim 24h alinhado ao horário atual.
 * O HTML do Alerta Rio é rolante (ex.: Manhã→Tarde→Noite→Madrugada do dia seguinte),
 * então prioriza o período de hoje; se já saiu da tabela, sintetiza pelo relógio.
 */
export function pickActivePeriod<
  T extends {
    name: DayPeriodName;
    label?: string;
    date?: string | null;
    dateHint?: string | null;
  },
>(periods: T[] | undefined, now = new Date()): T | null {
  const want = currentDayPeriod(now);
  const today = rioDayKey(now);
  if (periods?.length) {
    const exactToday = periods.find((p) => p.name === want && p.date === today);
    if (exactToday) return exactToday;
    const sameName = periods.find((p) => p.name === want && !p.date);
    if (sameName) return sameName;
  }
  // Relógio manda: mesmo sem coluna no HTML, o “Hoje” é o período atual.
  return {
    name: want,
    label: DAY_PERIOD_LABEL[want],
    date: today,
    dateHint: dateHintFromIso(today),
  } as T;
}

type UpcomingPeriodBase = {
  name: DayPeriodName;
  label: string;
  date?: string | null;
  dateHint?: string | null;
  sky: string | null;
  precip: string | null;
  wind: string | null;
  tempTrend: null;
  tempTrendLabel: null;
};

/**
 * Próximas 24h = sempre os 3 períodos após o atual, com data.
 * Preenche com o boletim 24h quando a coluna existir; senão deixa o slot
 * (a UI pode completar com a Estendida do dia).
 */
export function upcomingPeriods<
  T extends {
    name: DayPeriodName;
    label?: string;
    date?: string | null;
    dateHint?: string | null;
    sky?: string | null;
    precip?: string | null;
    wind?: string | null;
    tempTrend?: string | null;
    tempTrendLabel?: string | null;
  },
>(
  periods: T[] | undefined,
  active: T | null = pickActivePeriod(periods),
  now = new Date(),
): Array<T | UpcomingPeriodBase> {
  const baseName = active?.name ?? currentDayPeriod(now);
  const baseDate = active?.date ?? rioDayKey(now);
  const slots = nextThreePeriodSlots(baseName, baseDate);

  return slots.map((slot) => {
    const hit =
      periods?.find((p) => p.name === slot.name && p.date === slot.date) ??
      periods?.find((p) => p.name === slot.name && !p.date) ??
      null;
    if (hit) {
      return {
        ...hit,
        label: hit.label ?? slot.label,
        date: slot.date,
        dateHint: slot.dateHint,
      };
    }
    return {
      name: slot.name,
      label: slot.label,
      date: slot.date,
      dateHint: slot.dateHint,
      sky: null,
      precip: null,
      wind: null,
      tempTrend: null,
      tempTrendLabel: null,
    };
  });
}
