import type { TempTrend } from "./forecast-types";

export const PREVISAO_ESTENDIDA_URL =
  "https://alertario.rio.rj.gov.br/upload/PrevisaoEstendida.html";

export interface AlertaRioDayForecast {
  date: string;
  weekdayShort: string | null;
  iconFile: string | null;
  sky: string | null;
  precip: string | null;
  wind: string | null;
  tempTrend: TempTrend | null;
  tempTrendLabel: string | null;
  minTempC: number | null;
  maxTempC: number | null;
}

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTrend(raw: string): { trend: TempTrend | null; label: string | null } {
  const t = raw.toLowerCase();
  if (/decl[ií]nio/.test(t)) return { trend: "declinio", label: "Declínio" };
  if (/eleva/.test(t)) return { trend: "elevacao", label: "Elevação" };
  if (/est[aá]ve/.test(t)) return { trend: "estavel", label: "Estável" };
  return { trend: null, label: null };
}

function parseMaxMin(raw: string): { min: number | null; max: number | null } {
  const max =
    raw.match(/m[aá]x\.?\s*:?\s*(\d{1,2})\s*°?\s*C/i)?.[1] ??
    raw.match(/m[aá]xima\s*:?\s*(\d{1,2})/i)?.[1];
  const min =
    raw.match(/m[ií]n\.?\s*:?\s*(\d{1,2})\s*°?\s*C/i)?.[1] ??
    raw.match(/m[ií]nima\s*:?\s*(\d{1,2})/i)?.[1];
  return {
    min: min != null ? Number(min) : null,
    max: max != null ? Number(max) : null,
  };
}

function brDateToIso(dmy: string): string | null {
  const m = dmy.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function cellTexts(rowHtml: string): string[] {
  return [...rowHtml.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
    stripTags(m[1]),
  );
}

function cellHtmls(rowHtml: string): string[] {
  return [...rowHtml.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
}

/**
 * Parse da tabela oficial PrevisaoEstendida.html do Alerta Rio.
 * O HTML oficial às vezes omite o </tr> do cabeçalho de datas (fecha só no </thead>),
 * então as datas são extraídas por padrão — não pela contagem bruta de células.
 */
export function parsePrevisaoEstendidaHtml(html: string): AlertaRioDayForecast[] {
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1]);
  if (rows.length < 3) return [];

  // Datas: th/td com dd/mm/yyyy (ignora título e linhas de conteúdo misturadas).
  const dateHits = [
    ...html.matchAll(
      /<t[hd]\b[^>]*>\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*(?:<br\s*\/?>|\s)+([A-Za-zÁáÉéÍíÓóÚúÂâÊêÔôÃãÕõÇç]{3})/gi,
    ),
  ];
  const dates = dateHits.map((m) => ({
    iso: brDateToIso(m[1]),
    weekday: m[2] ?? null,
  })).filter((d): d is { iso: string; weekday: string | null } => Boolean(d.iso));

  const n = dates.length;
  if (!n) return [];

  const byLabel = new Map<string, string[]>();
  const iconFiles: Array<string | null> = Array(n).fill(null);

  for (const row of rows) {
    const texts = cellTexts(row);
    if (!texts.length) continue;

    const tempValues =
      texts.length === n &&
      texts.every((t) => /m[aá]x\.?\s*:|m[ií]n\.?\s*:/i.test(t))
        ? texts
        : texts.length === n + 1 &&
            !texts[0] &&
            texts.slice(1).every((t) => /m[aá]x\.?\s*:|m[ií]n\.?\s*:/i.test(t))
          ? texts.slice(1)
          : null;
    if (tempValues) {
      byLabel.set("temps", tempValues);
      continue;
    }

    if (texts.length < 2) continue;
    const label = texts[0].toLowerCase();
    const values = texts.slice(1, 1 + n);

    if (label.includes("condi") || label.includes("tempo")) {
      const htmls = cellHtmls(row).slice(1, 1 + n);
      htmls.forEach((cell, i) => {
        const file = cell.match(/icones\/([^"'>\s]+)/i)?.[1] ?? null;
        iconFiles[i] = file;
      });
      continue;
    }
    if (label.startsWith("céu") || label.startsWith("ceu")) byLabel.set("sky", values);
    else if (label.startsWith("precip")) byLabel.set("precip", values);
    else if (label.startsWith("vento")) byLabel.set("wind", values);
    else if (
      /tend[eê]ncia/.test(label) ||
      (/temperatura/.test(label) &&
        values.some((v) => /decl|eleva|est[aá]ve/i.test(v)))
    ) {
      byLabel.set("trend", values);
    }
  }

  const sky = byLabel.get("sky") ?? [];
  const precip = byLabel.get("precip") ?? [];
  const wind = byLabel.get("wind") ?? [];
  const trends = byLabel.get("trend") ?? [];
  const temps = byLabel.get("temps") ?? [];

  return dates.map((d, i) => {
    const trendInfo = parseTrend(trends[i] ?? "");
    const mm = parseMaxMin(temps[i] ?? "");
    return {
      date: d.iso,
      weekdayShort: d.weekday,
      iconFile: iconFiles[i],
      sky: sky[i] ?? null,
      precip: precip[i] ?? null,
      wind: wind[i] ?? null,
      tempTrend: trendInfo.trend,
      tempTrendLabel: trendInfo.label,
      minTempC: mm.min,
      maxTempC: mm.max,
    };
  });
}
