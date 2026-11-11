import { polishProse } from "./forecast-parse";
import type { ForecastBulletin, TempTrend } from "./forecast-types";
import { fetchAlertaHtml } from "./alerta-html-fetch";
import type { AlertaRioDayForecast } from "./estendida-parse";

export const PREVISAO_24H_URL =
  "https://alertario.rio.rj.gov.br/upload/Previsao.html";

export const PREVISAO_24H_PAGE = "https://alertario.rio.rj.gov.br/24-horas/";

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

function pickTrend(values: string[]): { trend: TempTrend | null; label: string | null } {
  const parsed = values.map(parseTrend).filter((t) => t.trend);
  const strong = parsed.find((t) => t.trend === "declinio" || t.trend === "elevacao");
  return strong ?? parsed[0] ?? { trend: null, label: null };
}

function pickPeriodValue(values: string[], preferIndex = 1): string | null {
  const clean = values.map((v) => v.trim()).filter(Boolean);
  if (!clean.length) return null;
  return clean[Math.min(preferIndex, clean.length - 1)] ?? clean[0] ?? null;
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

const PERIODS = ["madrugada", "manhã", "tarde", "noite"] as const;

function weekdayFullLabel(short: string | null, iso: string): string {
  if (short) {
    const map: Record<string, string> = {
      Seg: "Segunda-feira",
      Ter: "Terça-feira",
      Qua: "Quarta-feira",
      Qui: "Quinta-feira",
      Sex: "Sexta-feira",
      Sab: "Sábado",
      Sáb: "Sábado",
      Dom: "Domingo",
    };
    const key = short.normalize("NFC");
    const mapped =
      map[key] ??
      Object.entries(map).find(([k]) => k.toLowerCase() === key.toLowerCase())?.[1];
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

export type Previsao24hParsed = AlertaRioDayForecast & {
  periods: Array<{
    name: (typeof PERIODS)[number];
    sky: string | null;
    precip: string | null;
    wind: string | null;
    trend: string | null;
  }>;
  synopticNote: string | null;
};

/**
 * Boletim oficial Previsao.html (próximas ~24h por períodos do dia).
 */
export function parsePrevisao24hHtml(html: string): Previsao24hParsed | null {
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1]);
  if (!rows.length) return null;

  const headerRow =
    rows.find(
      (r) => /madrugada|manh[ãa]|tarde|noite/i.test(r) && /\d{1,2}\/\d{1,2}\/\d{4}/.test(r),
    ) ?? "";
  const headerText = stripTags(headerRow);
  const iso = brDateToIso(headerText.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)?.[1] ?? "");
  if (!iso) return null;

  const weekday =
    headerText.match(/\b(Seg|Ter|Qua|Qui|Sex|S[aá]b|Dom)\b/i)?.[1] ?? null;
  const byLabel = new Map<string, string[]>();

  for (const row of rows) {
    const texts = cellTexts(row);
    if (texts.length < 2) continue;
    const label = texts[0].toLowerCase();
    const values = texts.slice(1).filter(Boolean);
    if (!values.length) continue;
    if (label.startsWith("céu") || label.startsWith("ceu")) byLabel.set("sky", values);
    else if (label.startsWith("precip")) byLabel.set("precip", values);
    else if (label.startsWith("vento")) byLabel.set("wind", values);
    else if (label.includes("tend") || label.includes("temperatura")) {
      byLabel.set("trend", values);
    }
  }

  const zoneTemps = [
    ...html.matchAll(
      /m[aá]x\.?\s*:?\s*(\d{1,2})\s*°?\s*C[^\d]{0,20}m[ií]n\.?\s*:?\s*(\d{1,2})\s*°?\s*C/gi,
    ),
  ];
  let maxTempC: number | null = null;
  let minTempC: number | null = null;
  for (const m of zoneTemps) {
    const max = Number(m[1]);
    const min = Number(m[2]);
    if (Number.isFinite(max)) maxTempC = maxTempC == null ? max : Math.max(maxTempC, max);
    if (Number.isFinite(min)) minTempC = minTempC == null ? min : Math.min(minTempC, min);
  }

  const skyVals = byLabel.get("sky") ?? [];
  const precipVals = byLabel.get("precip") ?? [];
  const windVals = byLabel.get("wind") ?? [];
  const trendVals = byLabel.get("trend") ?? [];
  const trendInfo = pickTrend(trendVals);

  const periods = PERIODS.map((name, i) => ({
    name,
    sky: skyVals[i]?.trim() || null,
    precip: precipVals[i]?.trim() || null,
    wind: windVals[i]?.trim() || null,
    trend: trendVals[i]?.trim() || null,
  }));

  const synopticMatch = html.match(
    /descri[cç][aã]o\s+sin[oó]tica[\s\S]{0,80}?<td\b[^>]*>([\s\S]*?)<\/td>/i,
  );
  const synopticNote = synopticMatch ? polishProse(stripTags(synopticMatch[1])) : null;

  return {
    date: iso,
    weekdayShort: weekday,
    iconFile: null,
    sky: pickPeriodValue(skyVals, 1),
    precip: pickPeriodValue(precipVals, 1),
    wind: pickPeriodValue(windVals, 1),
    tempTrend: trendInfo.trend,
    tempTrendLabel: trendInfo.label,
    minTempC,
    maxTempC,
    periods,
    synopticNote: synopticNote || null,
  };
}

function detailFromPeriods(day: Previsao24hParsed): string {
  const bits = day.periods
    .map((p) => {
      const parts = [
        p.sky ? `céu ${p.sky.toLowerCase()}` : null,
        p.precip ? p.precip.toLowerCase() : null,
        p.wind ? `ventos ${p.wind.toLowerCase()}` : null,
      ].filter(Boolean);
      if (!parts.length) return null;
      return `Na ${p.name}, ${parts.join(", ")}`;
    })
    .filter(Boolean);
  const tempBits = [
    day.tempTrendLabel
      ? `as temperaturas apresentam ${day.tempTrendLabel.toLowerCase()}`
      : null,
    day.minTempC != null || day.maxTempC != null
      ? `com ${[
          day.minTempC != null ? `mínima prevista de ${day.minTempC}°C` : null,
          day.maxTempC != null ? `máxima de ${day.maxTempC}°C` : null,
        ]
          .filter(Boolean)
          .join(" e ")}`
      : null,
  ]
    .filter(Boolean)
    .join(", ");

  return polishProse([bits.join(". "), tempBits ? `No geral, ${tempBits}` : null]
    .filter(Boolean)
    .join(". "));
}

/** Monta o cartão "Hoje" a partir do boletim oficial de 24h do Alerta Rio. */
export function bulletinFromPrevisao24h(day: Previsao24hParsed): ForecastBulletin {
  const [, month, dayNum] = day.date.split("-");
  const label = weekdayFullLabel(day.weekdayShort, day.date);
  const dateHint = `${Number(dayNum)}/${Number(month)}`;
  const rain = day.precip ? polishProse(day.precip) : null;
  const sky = day.sky ? polishProse(day.sky) : null;
  const titleBits = [
    `${label} (${dateHint})`,
    rain && !/sem chuva/i.test(rain) ? rain : sky ? `céu ${sky.toLowerCase()}` : null,
    day.maxTempC != null ? `temperatura máxima prevista de ${day.maxTempC}°C` : null,
  ].filter(Boolean);

  const detail24h = detailFromPeriods(day);
  // A "descrição sinótica" do HTML costuma ser retrospectiva (dia anterior) —
  // para "Hoje" sintetizamos a partir da tabela de períodos.
  const synoptic = polishProse(
    [
      `Previsão oficial do Sistema Alerta Rio para ${label.toLowerCase()} (${dateHint})`,
      sky ? `com céu ${sky.toLowerCase()}` : null,
      rain ? `e ${rain.toLowerCase()}` : null,
    ]
      .filter(Boolean)
      .join(" "),
  );

  return {
    fetchedAt: new Date().toISOString(),
    source: "live",
    sourceUrl: PREVISAO_24H_PAGE,
    title: polishProse(titleBits.join(" com ")).replace(/ com temperatura/, " e temperatura"),
    publishedAt: `${day.date}T12:00:00-03:00`,
    synoptic,
    detail24h,
    minTempC: day.minTempC,
    maxTempC: day.maxTempC,
    tempTrend: day.tempTrend,
    tempTrendLabel: day.tempTrendLabel,
    days: [],
  };
}

export async function fetchPrevisao24h(): Promise<Previsao24hParsed | null> {
  const html = await fetchAlertaHtml(PREVISAO_24H_URL, PREVISAO_24H_PAGE);
  return html ? parsePrevisao24hHtml(html) : null;
}
