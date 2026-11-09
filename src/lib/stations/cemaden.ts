import { CEMADEN_COORDS } from "./cemaden-coords";
import { classifyHealth, networkLabel } from "./health";
import type { UnifiedStation } from "./types";

const CEMADEN_URL =
  "https://resources.cemaden.gov.br/graficos/interativo/getJson2.php?uf=RJ";
const IBGE_RIO = 3304557;

interface CemadenRow {
  idestacao?: number;
  cidade?: string;
  codibge?: number;
  nomeestacao?: string;
  datahoraUltimovalor?: string | null;
  ultimovalor?: number | null;
  acc1hr?: string | number | null;
  acc24hr?: string | number | null;
}

function parseAcc(v: string | number | null | undefined): number | null {
  if (v == null || v === "-" || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** datahora CEMADEN: "09/11/26 14:50" (UTC) */
function parseCemadenTime(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(/(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, dd, mm, yy, hh, mi] = m;
  const iso = `20${yy}-${mm}-${dd}T${hh}:${mi}:00Z`;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

export async function fetchCemadenStations(): Promise<UnifiedStation[]> {
  try {
    const res = await fetch(CEMADEN_URL, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "WeatherForecast/1.0",
      },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as CemadenRow[];
    if (!Array.isArray(rows)) return [];

    return rows
      .filter(
        (r) =>
          r.codibge === IBGE_RIO ||
          (r.cidade || "").toUpperCase() === "RIO DE JANEIRO",
      )
      .map((r) => {
        const id = r.idestacao ?? 0;
        const coord = CEMADEN_COORDS[id];
        const iso = parseCemadenTime(r.datahoraUltimovalor);
        const health = classifyHealth(iso);
        const h1 = parseAcc(r.acc1hr);
        const h24 = parseAcc(r.acc24hr);
        const last = r.ultimovalor ?? null;
        const raining = h1 != null ? h1 >= 0.2 : last != null ? last >= 0.2 : null;
        return {
          id: `cemaden:${id}`,
          network: "cemaden" as const,
          networkLabel: networkLabel("cemaden"),
          name: r.nomeestacao || coord?.name || `CEMADEN ${id}`,
          subtitle: "Pluviômetro CEMADEN",
          lat: coord?.lat ?? null,
          lon: coord?.lon ?? null,
          readAt: r.datahoraUltimovalor
            ? `${r.datahoraUltimovalor} UTC`
            : null,
          readAtIso: iso,
          ...health,
          rainMmH1: h1,
          rainMmH24: h24,
          rainMmM15: null,
          temperatureC: null,
          humidityPct: null,
          windSpeedKmh: null,
          weatherText:
            raining === true
              ? "Chovendo (acúmulo recente)"
              : raining === false
                ? "Sem chuva recente"
                : "Sem dado de chuva",
          raining,
          detail: null,
        } satisfies UnifiedStation;
      });
  } catch {
    return [];
  }
}
