import type { ForecastBulletin, ForecastDay, TempTrend } from "./forecast-types";

export const PREVISAO_ESTENDIDA_URL =
  "https://alertario.rio.rj.gov.br/upload/PrevisaoEstendida.html";
export const PREVISAO_24H_URL =
  "https://alertario.rio.rj.gov.br/upload/Previsao.html";
export const ICON_BASE = "https://alertario.rio.rj.gov.br/upload/icones";

export interface AlertaRioDayForecast {
  date: string; // YYYY-MM-DD
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

/** Parse da tabela oficial PrevisaoEstendida.html do Alerta Rio. */
export function parsePrevisaoEstendidaHtml(html: string): AlertaRioDayForecast[] {
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1]);
  if (rows.length < 3) return [];

  // Cabeçalho com datas fica no 2º <tr> do thead (após o título)
  const headerRow =
    rows.find((r) => /\d{1,2}\/\d{1,2}\/\d{4}/.test(r) && /<th\b/i.test(r)) ?? "";
  const dateThs = [...headerRow.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)]
    .map((m) => m[1])
    .slice(1); // ignora primeira th vazia

  const dates = dateThs.map((th) => {
    const text = stripTags(th);
    const iso = brDateToIso(text);
    const weekday = text.match(/\b(Seg|Ter|Qua|Qui|Sex|S[aá]b|Dom)\b/i)?.[1] ?? null;
    return { iso, weekday };
  });

  const n = dates.length;
  if (!n) return [];

  const byLabel = new Map<string, string[]>();
  const iconFiles: Array<string | null> = Array(n).fill(null);

  for (const row of rows) {
    const texts = cellTexts(row);
    if (!texts.length) continue;

    // Linha só de máx/mín (rowspan da temperatura) — todas as células são valores
    if (
      texts.length === n &&
      texts.every((t) => /m[aá]x\.?\s*:|m[ií]n\.?\s*:/i.test(t))
    ) {
      byLabel.set("temps", texts);
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
    else if (label.includes("temperatura")) byLabel.set("trend", values);
  }

  const sky = byLabel.get("sky") ?? [];
  const precip = byLabel.get("precip") ?? [];
  const wind = byLabel.get("wind") ?? [];
  const trends = byLabel.get("trend") ?? [];
  const temps = byLabel.get("temps") ?? [];

  const out: AlertaRioDayForecast[] = [];
  dates.forEach((d, i) => {
    if (!d.iso) return;
    const trendInfo = parseTrend(trends[i] ?? "");
    const mm = parseMaxMin(temps[i] ?? "");
    out.push({
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
    });
  });
  return out;
}

export async function fetchPrevisaoEstendida(): Promise<AlertaRioDayForecast[]> {
  try {
    const res = await fetch(PREVISAO_ESTENDIDA_URL, {
      cache: "no-store",
      headers: {
        Accept: "text/html",
        Referer: "https://alertario.rio.rj.gov.br/4-dias/",
        "User-Agent": "Mozilla/5.0 (compatible; WeatherForecast/1.0)",
      },
    });
    if (!res.ok) return [];
    return parsePrevisaoEstendidaHtml(await res.text());
  } catch {
    return [];
  }
}

function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function rioYear(iso: string): number {
  return Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
    }).format(new Date(iso)),
  );
}

/** Datas YYYY-MM-DD a partir do dateHint do boletim COR. */
export function dateHintToIsos(dateHint: string | null, publishedAt: string): string[] {
  if (!dateHint) return [];
  const year = rioYear(publishedAt);
  const hint = dateHint.replace(/–/g, "-").replace(/\s+/g, " ").trim();

  const andMatch = hint.match(/^(\d{1,2})\s*e\s*(\d{1,2})\/(\d{1,2})$/i);
  if (andMatch) {
    const month = Number(andMatch[3]);
    return [ymd(year, month, Number(andMatch[1])), ymd(year, month, Number(andMatch[2]))];
  }
  const rangeMatch = hint.match(/^(\d{1,2})\s*-\s*(\d{1,2})\/(\d{1,2})$/);
  if (rangeMatch) {
    const month = Number(rangeMatch[3]);
    const a = Number(rangeMatch[1]);
    const b = Number(rangeMatch[2]);
    const out: string[] = [];
    for (let d = Math.min(a, b); d <= Math.max(a, b); d++) out.push(ymd(year, month, d));
    return out;
  }
  const single = hint.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (single) return [ymd(year, Number(single[2]), Number(single[1]))];
  return [];
}

function aggregateDays(matches: AlertaRioDayForecast[]): {
  minTempC: number | null;
  maxTempC: number | null;
  tempTrend: TempTrend | null;
  tempTrendLabel: string | null;
  iconFile: string | null;
  precip: string | null;
  wind: string | null;
  sky: string | null;
} {
  const mins = matches.map((m) => m.minTempC).filter((n): n is number => n != null);
  const maxs = matches.map((m) => m.maxTempC).filter((n): n is number => n != null);
  const primary = matches[0];
  return {
    minTempC: mins.length ? Math.min(...mins) : null,
    maxTempC: maxs.length ? Math.max(...maxs) : null,
    tempTrend: primary?.tempTrend ?? null,
    tempTrendLabel: primary?.tempTrendLabel ?? null,
    iconFile: primary?.iconFile ?? null,
    precip: primary?.precip ?? null,
    wind: primary?.wind ?? null,
    sky: primary?.sky ?? null,
  };
}

/**
 * Completa próximos dias com mín/máx/tendência/ícone oficiais do Alerta Rio
 * (Previsão 4 dias a frente).
 */
export async function enrichDaysFromAlertaRio(
  bulletin: ForecastBulletin,
): Promise<ForecastBulletin> {
  const extended = await fetchPrevisaoEstendida();
  if (!extended.length) return bulletin;

  const byDate = new Map(extended.map((d) => [d.date, d]));

  const days: ForecastDay[] = bulletin.days.map((day) => {
    const keys = dateHintToIsos(day.dateHint, bulletin.publishedAt);
    const matches = keys
      .map((k) => byDate.get(k))
      .filter((d): d is AlertaRioDayForecast => Boolean(d));
    if (!matches.length) return day;

    const agg = aggregateDays(matches);
    return {
      ...day,
      minTempC: day.minTempC ?? agg.minTempC,
      maxTempC: day.maxTempC ?? agg.maxTempC,
      tempTrend: day.tempTrend ?? agg.tempTrend,
      rainHint: day.rainHint ?? (agg.precip ? stripTags(agg.precip) : null),
      windHint: day.windHint ?? (agg.wind ? stripTags(agg.wind) : null),
      iconUrl: agg.iconFile ? `${ICON_BASE}/${agg.iconFile}` : day.iconUrl ?? null,
      skyHint: day.skyHint ?? agg.sky,
    };
  });

  // Se o boletim COR não listou dias, monta a partir da previsão estendida
  const finalDays =
    days.length > 0
      ? days
      : extended.map((d) => {
          const [, month, dayNum] = d.date.split("-");
          return {
            label: d.weekdayShort ?? d.date,
            dateHint: `${Number(dayNum)}/${Number(month)}`,
            summary: [d.sky, d.precip, d.wind].filter(Boolean).join(". ") + ".",
            rainHint: d.precip,
            windHint: d.wind,
            minTempC: d.minTempC,
            maxTempC: d.maxTempC,
            tempTrend: d.tempTrend,
            iconUrl: d.iconFile ? `${ICON_BASE}/${d.iconFile}` : null,
            skyHint: d.sky,
          } satisfies ForecastDay;
        });

  return { ...bulletin, days: finalDays };
}
