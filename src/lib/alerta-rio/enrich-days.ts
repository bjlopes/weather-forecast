import { polishProse } from "./forecast-parse";
import type { ForecastBulletin, ForecastDay, TempTrend } from "./forecast-types";
import { fetchPrevisaoEstendida } from "./estendida-fetch";
import type { AlertaRioDayForecast } from "./estendida-parse";

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

function shortPrecipHint(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const base = polishProse(raw)
    .split(/\s+(?:durante|a partir|entre|no período|pela|pela manhã|à tarde|até)\b/i)[0]
    .trim()
    .replace(/[.,;:\s]+$/, "");
  return base || null;
}

function shortSkyHint(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const first = raw.split(/\s*·\s*/)[0]?.trim() ?? raw;
  return polishProse(first).replace(/\.$/, "") || null;
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

  const multiFull = [...hint.matchAll(/(\d{1,2})\/(\d{1,2})/g)].map((m) =>
    ymd(year, Number(m[2]), Number(m[1])),
  );
  if (multiFull.length > 1 && /\be\b|-/.test(hint)) {
    return [...new Set(multiFull)];
  }

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

function compactHint(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return polishProse(stripTags(raw).replace(/\s+/g, " ")) || null;
}

function synthesizeSummary(d: AlertaRioDayForecast): string {
  const sky = shortSkyHint(d.sky);
  const precip = shortPrecipHint(d.precip) ?? compactHint(d.precip);
  const windRaw = compactHint(d.wind);
  const wind = windRaw ? `Ventos ${windRaw.toLowerCase()}` : null;
  const parts = [
    sky ? `Céu ${sky.toLowerCase()}` : null,
    precip,
    wind,
  ].filter(Boolean);
  return polishProse(parts.join(". "));
}

function toForecastDay(
  d: AlertaRioDayForecast,
  corByDate: Map<string, { day: ForecastDay; span: number }>,
): ForecastDay {
  const [, month, dayNum] = d.date.split("-");
  const corHit = corByDate.get(d.date);

  const skyHint = shortSkyHint(d.sky) ?? shortSkyHint(corHit?.day.skyHint) ?? null;
  const rainHint =
    shortPrecipHint(d.precip) ??
    shortPrecipHint(corHit?.day.rainHint) ??
    compactHint(d.precip) ??
    compactHint(corHit?.day.rainHint);
  const windHint = compactHint(d.wind) ?? compactHint(corHit?.day.windHint);
  const summary =
    synthesizeSummary({
      ...d,
      sky: skyHint,
      precip: rainHint,
      wind: windHint,
    }) ||
    (corHit?.day.summary ? polishProse(corHit.day.summary) : "");

  const corRaw = corHit?.day.corDetail || corHit?.day.summary || null;
  const corDetail = corRaw ? polishProse(corRaw) : null;

  return {
    label: weekdayFullLabel(d.weekdayShort, d.date),
    dateHint: `${Number(dayNum)}/${Number(month)}`,
    summary,
    rainHint,
    windHint,
    minTempC: d.minTempC ?? corHit?.day.minTempC ?? null,
    maxTempC: d.maxTempC ?? corHit?.day.maxTempC ?? null,
    tempTrend: d.tempTrend ?? corHit?.day.tempTrend ?? null,
    iconUrl: null,
    skyHint,
    corDetail,
  };
}

function rioDayKey(isoOrDate: string | Date): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate);
  } catch {
    return typeof isoOrDate === "string" ? isoOrDate.slice(0, 10) : "";
  }
}

function rioTodayYmd(now = new Date()): string {
  return rioDayKey(now);
}

/**
 * Próximos dias = Previsão Estendida do Alerta Rio (sempre 4 dias à frente).
 * Edge-safe: fetch puro (WAF bloqueia Node serverless).
 */
export async function enrichDaysFromAlertaRio(
  bulletin: ForecastBulletin,
): Promise<ForecastBulletin> {
  const today = rioTodayYmd();

  const corByDate = new Map<string, { day: ForecastDay; span: number }>();
  for (const day of bulletin.days) {
    const keys = dateHintToIsos(day.dateHint, bulletin.publishedAt);
    for (const key of keys) {
      const prev = corByDate.get(key);
      if (!prev || keys.length < prev.span) {
        corByDate.set(key, { day, span: keys.length });
      }
    }
  }

  const extended = await fetchPrevisaoEstendida();
  if (extended.length) {
    const bulletinDay = rioDayKey(bulletin.publishedAt);
    const days = extended
      // Próximos dias: futuros, sem repetir o dia já usado em "Hoje".
      .filter((d) => d.date > today && d.date !== bulletinDay)
      .map((d) => toForecastDay(d, corByDate));
    return { ...bulletin, days, daysSource: "estendida" };
  }

  const days: ForecastDay[] = [];
  const seen = new Set<string>();
  for (const day of bulletin.days) {
    const keys = dateHintToIsos(day.dateHint, bulletin.publishedAt);
    const future = keys.length ? keys.filter((iso) => iso > today) : [];
    if (!future.length) {
      if (!keys.length) days.push(day);
      continue;
    }
    for (const iso of future) {
      if (seen.has(iso)) continue;
      seen.add(iso);
      const [, month, dayNum] = iso.split("-");
      days.push({
        ...day,
        label: weekdayFullLabel(null, iso),
        dateHint: `${Number(dayNum)}/${Number(month)}`,
      });
    }
  }
  return {
    ...bulletin,
    days: days.slice(0, 4),
    daysSource: bulletin.source === "sample" ? "sample" : "cor",
  };
}

export type { TempTrend };
