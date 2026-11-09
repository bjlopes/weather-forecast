import { classifyHealth, networkLabel } from "./health";
import type { UnifiedStation } from "./types";

const ICAOS = ["SBGL", "SBRJ", "SBJR", "SBSC"] as const;

const NAMES: Record<string, string> = {
  SBGL: "Galeão · Tom Jobim",
  SBRJ: "Santos Dumont",
  SBJR: "Jacarepaguá · Roberto Marinho",
  SBSC: "Santa Cruz · Base Aérea",
};

interface MetarRow {
  icaoId?: string;
  reportTime?: string;
  obsTime?: number;
  temp?: number;
  dewp?: number;
  wspd?: number;
  wdir?: number | string;
  wxString?: string;
  rawOb?: string;
  lat?: number;
  lon?: number;
  name?: string;
  visib?: string | number;
  cover?: string;
}

function humidityFromTempDew(temp: number, dewp: number): number {
  // August-Roche-Magnus approximation
  const a = 17.625;
  const b = 243.04;
  const alpha = (a * dewp) / (b + dewp) - (a * temp) / (b + temp);
  return Math.round(100 * Math.exp(alpha));
}

function rainingFromWx(wx?: string, raw?: string): boolean {
  const s = `${wx ?? ""} ${raw ?? ""}`.toUpperCase();
  return /\b(RA|DZ|SHRA|TSRA)\b/.test(s);
}

function weatherText(row: MetarRow): string {
  const parts: string[] = [];
  if (row.wxString) parts.push(row.wxString);
  else if (rainingFromWx(undefined, row.rawOb)) parts.push("Chuva");
  else parts.push("Sem chuva no METAR");
  if (row.cover) parts.push(row.cover);
  if (row.visib != null) parts.push(`vis ${row.visib}`);
  return parts.join(" · ");
}

export async function fetchMetarStations(): Promise<UnifiedStation[]> {
  try {
    const url = `https://aviationweather.gov/api/data/metar?ids=${ICAOS.join(",")}&format=json&hours=3`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json", "User-Agent": "WeatherForecast/1.0" },
    });
    if (!res.ok) return fallbackMetars();
    const rows = (await res.json()) as MetarRow[];
    if (!Array.isArray(rows) || rows.length === 0) return fallbackMetars();

    const latest = new Map<string, MetarRow>();
    for (const row of rows) {
      const id = row.icaoId;
      if (!id) continue;
      const prev = latest.get(id);
      const t = row.obsTime ?? 0;
      const pt = prev?.obsTime ?? 0;
      if (!prev || t >= pt) latest.set(id, row);
    }

    return ICAOS.map((icao) => {
      const row = latest.get(icao);
      if (!row) {
        return {
          id: `metar:${icao}`,
          network: "metar" as const,
          networkLabel: networkLabel("metar"),
          name: NAMES[icao],
          subtitle: icao,
          lat: null,
          lon: null,
          readAt: null,
          readAtIso: null,
          ...classifyHealth(null),
          rainMmH1: null,
          rainMmH24: null,
          rainMmM15: null,
          temperatureC: null,
          humidityPct: null,
          windSpeedKmh: null,
          weatherText: "METAR indisponível",
          raining: null,
          detail: null,
        };
      }
      const iso =
        row.reportTime ??
        (row.obsTime != null ? new Date(row.obsTime * 1000).toISOString() : null);
      const health = classifyHealth(iso);
      const temp = row.temp ?? null;
      const dewp = row.dewp;
      return {
        id: `metar:${icao}`,
        network: "metar" as const,
        networkLabel: networkLabel("metar"),
        name: NAMES[icao],
        subtitle: icao,
        lat: row.lat ?? null,
        lon: row.lon ?? null,
        readAt: iso
          ? new Date(iso).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })
          : null,
        readAtIso: iso,
        ...health,
        rainMmH1: null,
        rainMmH24: null,
        rainMmM15: null,
        temperatureC: temp,
        humidityPct:
          temp != null && dewp != null ? humidityFromTempDew(temp, dewp) : null,
        windSpeedKmh: row.wspd != null ? Math.round(row.wspd * 1.852 * 10) / 10 : null,
        weatherText: weatherText(row),
        raining: rainingFromWx(row.wxString, row.rawOb),
        detail: row.rawOb ?? null,
      };
    });
  } catch {
    return fallbackMetars();
  }
}

function fallbackMetars(): UnifiedStation[] {
  const coords: Record<string, { lat: number; lon: number }> = {
    SBGL: { lat: -22.815, lon: -43.261 },
    SBRJ: { lat: -22.91, lon: -43.163 },
    SBJR: { lat: -22.988, lon: -43.37 },
    SBSC: { lat: -22.932, lon: -43.719 },
  };
  return ICAOS.map((icao) => ({
    id: `metar:${icao}`,
    network: "metar" as const,
    networkLabel: networkLabel("metar"),
    name: NAMES[icao],
    subtitle: icao,
    lat: coords[icao].lat,
    lon: coords[icao].lon,
    readAt: null,
    readAtIso: null,
    ...classifyHealth(null),
    rainMmH1: null,
    rainMmH24: null,
    rainMmM15: null,
    temperatureC: null,
    humidityPct: null,
    windSpeedKmh: null,
    weatherText: "METAR indisponível no momento",
    raining: null,
    detail: null,
  }));
}
