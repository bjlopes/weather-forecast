import type { AlertaRioSnapshot, MeteoStation, RainStation, ZoneStatus } from "./types";
import { zoneForStation } from "./zones";

function parsePtNumber(raw: string): number | null {
  const t = raw.trim().replace(/\u00a0/g, "");
  if (!t || t === "-" || t.toUpperCase() === "ND") return null;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function decode(html: string): string {
  return html
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function extractTables(html: string): string[][][] {
  const tables: string[][][] = [];
  const tableRe = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  let tm: RegExpExecArray | null;
  while ((tm = tableRe.exec(html))) {
    const rows: string[][] = [];
    const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    let rm: RegExpExecArray | null;
    while ((rm = rowRe.exec(tm[1]))) {
      const cells: string[] = [];
      const cellRe = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cm: RegExpExecArray | null;
      while ((cm = cellRe.exec(rm[1]))) {
        const text = decode(cm[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
        cells.push(text);
      }
      if (cells.length) rows.push(cells);
    }
    if (rows.length) tables.push(rows);
  }
  return tables;
}

export function parseAlertaRioHtml(html: string, sourceUrl: string): AlertaRioSnapshot {
  const tables = extractTables(html);
  let rainStations: RainStation[] = [];
  let meteoStations: MeteoStation[] = [];
  const zones: ZoneStatus[] = [];

  for (const rows of tables) {
    if (rows.length < 2) continue;
    const combined = `${rows[0].join(" ")} ${rows[1]?.join(" ") ?? ""}`.toLowerCase();
    const isRain =
      combined.includes("estação") &&
      (combined.includes("15 min") || combined.includes("24 h") || combined.includes("96 h") || combined.includes("no mês"));
    const isMeteo =
      combined.includes("temperatura") || combined.includes("umidade") || combined.includes("velocidade vento");

    if (isRain && !isMeteo) {
      rainStations = rows.slice(1).flatMap((c) => {
        if (c.length < 8) return [];
        const id = Number(c[0]);
        if (!Number.isFinite(id)) return [];
        const hasZone = c.length >= 16;
        const offset = hasZone ? 4 : 3;
        const nums = c.slice(offset).map(parsePtNumber);
        return [{
          id,
          name: c[1],
          zone: zoneForStation(id),
          readAt: hasZone ? c[3] : c[2],
          rainMm: {
            m05: nums[0] ?? null,
            m10: nums[1] ?? null,
            m15: nums[2] ?? null,
            m30: hasZone ? nums[3] ?? null : null,
            h1: hasZone ? nums[4] ?? null : nums[3] ?? null,
            h2: hasZone ? nums[5] ?? null : null,
            h3: hasZone ? nums[6] ?? null : null,
            h4: hasZone ? nums[7] ?? null : nums[4] ?? null,
            h6: hasZone ? nums[8] ?? null : null,
            h12: hasZone ? nums[9] ?? null : null,
            h24: hasZone ? nums[10] ?? null : nums[5] ?? null,
            h96: hasZone ? nums[11] ?? null : nums[6] ?? null,
            month: hasZone ? nums[12] ?? null : nums[7] ?? null,
          },
        } satisfies RainStation];
      });
      continue;
    }

    if (isMeteo) {
      meteoStations = rows.slice(1).flatMap((c) => {
        if (c.length < 5) return [];
        const id = Number(c[0]);
        if (!Number.isFinite(id)) return [];
        const looksWebsempre = c.length >= 8 && combined.includes("orvalho");
        if (looksWebsempre) {
          return [{
            id, name: c[1], readAt: c[2],
            temperatureC: parsePtNumber(c[3]), humidityPct: parsePtNumber(c[4]),
            pressureHpa: parsePtNumber(c[5]), dewPointC: parsePtNumber(c[6]),
            windSpeedKmh: parsePtNumber(c[7]), windDirDeg: parsePtNumber(c[8] ?? ""),
          } satisfies MeteoStation];
        }
        return [{
          id, name: c[1], readAt: c[2],
          windDirDeg: parsePtNumber(c[3]), windSpeedKmh: parsePtNumber(c[4]),
          temperatureC: parsePtNumber(c[5]), pressureHpa: parsePtNumber(c[6]),
          humidityPct: parsePtNumber(c[7] ?? ""), dewPointC: null,
        } satisfies MeteoStation];
      });
    }

    const flat = rows.map((r) => r.join(" ")).join("\n");
    if (flat.includes("Estágio") || flat.includes("Escorregamento")) {
      for (const c of rows) {
        if (c.length < 2) continue;
        const zone = c[0] as ZoneStatus["zone"];
        if (!["Baía de Guanabara", "Baía de Sepetiba", "Barra/Jacarepaguá", "Zona Sul"].includes(zone)) continue;
        const existing = zones.find((z) => z.zone === zone);
        if (flat.includes("Escorregamento")) {
          if (existing) existing.landslideRisk = c[1];
          else zones.push({ zone, rainStage: "—", landslideRisk: c[1] });
        } else if (c[1].includes("Estágio")) {
          if (existing) existing.rainStage = c[1];
          else zones.push({ zone, rainStage: c[1], landslideRisk: "—" });
        }
      }
    }
  }

  if (!rainStations.length) {
    throw new Error("Não foi possível ler a tabela pluviométrica do Alerta Rio.");
  }

  return {
    fetchedAt: new Date().toISOString(),
    source: "live",
    sourceUrl,
    rainStations,
    meteoStations,
    zones,
  };
}
