import { classifyHealth, networkLabel } from "./health";
import type { UnifiedStation } from "./types";

const INMET_RIO = [
  {
    code: "A652",
    name: "Forte de Copacabana",
    lat: -22.98833333,
    lon: -43.19055555,
  },
  {
    code: "A636",
    name: "Jacarepaguá",
    lat: -22.94,
    lon: -43.40277777,
  },
  {
    code: "A621",
    name: "Vila Militar",
    lat: -22.86138888,
    lon: -43.41138888,
  },
  {
    code: "A602",
    name: "Marambaia",
    lat: -23.05027777,
    lon: -43.59555555,
  },
] as const;

interface InmetRow {
  CD_ESTACAO?: string;
  DT_MEDICAO?: string;
  HR_MEDICAO?: string;
  TEM_INS?: string | number | null;
  UMD_INS?: string | number | null;
  VEN_VEL?: string | number | null;
  CHUVA?: string | number | null;
}

function num(v: string | number | null | undefined): number | null {
  if (v == null || v === "" || v === "null") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function rowIso(row: InmetRow): string | null {
  const d = row.DT_MEDICAO;
  const h = row.HR_MEDICAO;
  if (!d) return null;
  // DT often YYYY-MM-DD, HR often HHMM UTC
  const hh = h ? String(h).padStart(4, "0") : "0000";
  const iso = `${d}T${hh.slice(0, 2)}:${hh.slice(2, 4)}:00Z`;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

async function fetchStationSeries(code: string): Promise<InmetRow[]> {
  const end = new Date();
  const start = new Date(end.getTime() - 36 * 3_600_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const url = `https://apitempo.inmet.gov.br/estacao/${code}/${fmt(start)}/${fmt(end)}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": "WeatherForecast/1.0",
    },
  });
  if (!res.ok) return [];
  const text = await res.text();
  if (!text || text.trim() === "" || text.trim() === "[]") return [];
  try {
    const data = JSON.parse(text) as InmetRow[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchInmetStations(): Promise<UnifiedStation[]> {
  const results = await Promise.all(
    INMET_RIO.map(async (st) => {
      let latest: InmetRow | null = null;
      try {
        const rows = await fetchStationSeries(st.code);
        latest = rows.length
          ? rows.reduce((a, b) => {
              const ta = Date.parse(rowIso(a) ?? "") || 0;
              const tb = Date.parse(rowIso(b) ?? "") || 0;
              return tb >= ta ? b : a;
            })
          : null;
      } catch {
        latest = null;
      }

      const iso = latest ? rowIso(latest) : null;
      const health = iso
        ? classifyHealth(iso)
        : { health: "ativa" as const, healthLabel: "Operante (catálogo)" };
      const rain = latest ? num(latest.CHUVA) : null;
      const windMs = latest ? num(latest.VEN_VEL) : null;

      return {
        id: `inmet:${st.code}`,
        network: "inmet" as const,
        networkLabel: networkLabel("inmet"),
        name: st.name,
        subtitle: st.code,
        lat: st.lat,
        lon: st.lon,
        readAt: iso
          ? new Date(iso).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Catálogo INMET",
        readAtIso: iso,
        ...health,
        rainMmH1: rain,
        rainMmH24: null,
        rainMmM15: null,
        temperatureC: latest ? num(latest.TEM_INS) : null,
        humidityPct: latest ? num(latest.UMD_INS) : null,
        windSpeedKmh: windMs != null ? Math.round(windMs * 3.6 * 10) / 10 : null,
        weatherText:
          rain != null && rain >= 0.2
            ? `Chuva ${rain.toLocaleString("pt-BR")} mm (hora)`
            : iso
              ? "Sem chuva na última hora"
              : "Dados horários indisponíveis no momento",
        raining: rain != null ? rain >= 0.2 : null,
        detail: null,
      } satisfies UnifiedStation;
    }),
  );
  return results;
}
