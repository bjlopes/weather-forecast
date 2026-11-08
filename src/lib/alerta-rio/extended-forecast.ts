import { polishProse } from "./forecast-parse";
import type { ForecastBulletin, ForecastDay, TempTrend } from "./forecast-types";

export const PREVISAO_ESTENDIDA_URL =
  "https://alertario.rio.rj.gov.br/upload/PrevisaoEstendida.html";
export const PREVISAO_24H_URL =
  "https://alertario.rio.rj.gov.br/upload/Previsao.html";

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

const WEEKDAY_FULL: Record<string, string> = {
  Seg: "Segunda-feira",
  Ter: "Terça-feira",
  Qua: "Quarta-feira",
  Qui: "Quinta-feira",
  Sex: "Sexta-feira",
  Sab: "Sábado",
  Sáb: "Sábado",
  Dom: "Domingo",
};

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

function weekdayFullLabel(short: string | null, iso: string): string {
  if (short) {
    const key = short.normalize("NFC");
    const mapped =
      WEEKDAY_FULL[key] ??
      WEEKDAY_FULL[key.replace(/^Sáb$/i, "Sáb")] ??
      Object.entries(WEEKDAY_FULL).find(([k]) => k.toLowerCase() === key.toLowerCase())?.[1];
    if (mapped) return mapped;
  }
  try {
    const label = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(`${iso}T12:00:00-03:00`));
    return label.replace(/^\w/, (c) => c.toLocaleUpperCase("pt-BR"));
  } catch {
    return short ?? iso;
  }
}

function synthesizeSummary(d: AlertaRioDayForecast): string {
  const sky = d.sky ? `Céu ${d.sky.toLowerCase()}` : null;
  const precip = d.precip;
  const wind = d.wind ? `Ventos ${d.wind.toLowerCase()}` : null;
  return polishProse([sky, precip, wind].filter(Boolean).join(". "));
}

function compactHint(raw: string | null): string | null {
  if (!raw) return null;
  return polishProse(stripTags(raw).replace(/\s+/g, " "));
}

/**
 * Monta próximos dias a partir da tabela oficial Previsão Estendida (4 dias)
 * do Alerta Rio — um dia por coluna (Segunda, Terça…). Texto do boletim COR
 * entra como resumo quando cobre exatamente aquele dia; caso contrário sintetiza
 * a partir de céu / precipitação / vento do Alerta Rio.
 */
export async function enrichDaysFromAlertaRio(
  bulletin: ForecastBulletin,
): Promise<ForecastBulletin> {
  const extended = await fetchPrevisaoEstendida();
  if (!extended.length) return bulletin;

  const corByDate = new Map<string, { day: ForecastDay; span: number }>();
  for (const day of bulletin.days) {
    const keys = dateHintToIsos(day.dateHint, bulletin.publishedAt);
    for (const key of keys) {
      const prev = corByDate.get(key);
      // Prefere entrada COR de um único dia quando houver conflito
      if (!prev || keys.length < prev.span) {
        corByDate.set(key, { day, span: keys.length });
      }
    }
  }

  const days: ForecastDay[] = extended.map((d) => {
    const [, month, dayNum] = d.date.split("-");
    const corHit = corByDate.get(d.date);
    const useCorSummary = Boolean(corHit && corHit.span === 1 && corHit.day.summary);

    return {
      label: weekdayFullLabel(d.weekdayShort, d.date),
      dateHint: `${Number(dayNum)}/${Number(month)}`,
      summary: useCorSummary ? corHit!.day.summary : synthesizeSummary(d),
      rainHint: compactHint(d.precip) ?? corHit?.day.rainHint ?? null,
      windHint: compactHint(d.wind) ?? corHit?.day.windHint ?? null,
      minTempC: d.minTempC,
      maxTempC: d.maxTempC,
      tempTrend: d.tempTrend,
      iconUrl: null,
      skyHint: d.sky,
    } satisfies ForecastDay;
  });

  return { ...bulletin, days };
}
