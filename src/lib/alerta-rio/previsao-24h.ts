import { polishProse } from "./forecast-parse";
import type {
  ForecastBulletin,
  ForecastPeriod,
  ForecastZoneTemp,
  TempTrend,
} from "./forecast-types";
import {
  DAY_PERIOD_LABEL,
  pickActivePeriod,
  type DayPeriodName,
} from "./forecast-zone";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fetchAlertaHtml, markdownTablesToHtml } from "./alerta-html-fetch";
import type { AlertaRioDayForecast } from "./estendida-parse";

export { pickActivePeriod, pickZoneTemp } from "./forecast-zone";

export const PREVISAO_24H_URL =
  "https://alertario.rio.rj.gov.br/upload/Previsao.html";

/** Host espelho histórico do Alerta Rio (às vezes passa quando o .rio.rj.gov.br está no WAF). */
export const PREVISAO_24H_MIRROR_URL =
  "https://www.sistema-alerta-rio.com.br/upload/Previsao.html";

export const PREVISAO_24H_PAGE = "https://alertario.rio.rj.gov.br/24-horas/";
export const PREVISAO_ESTENDIDA_PAGE = "https://alertario.rio.rj.gov.br/4-dias/";

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

function normalizePeriodName(raw: string): DayPeriodName | null {
  const t = raw.toLowerCase().normalize("NFC");
  if (t.includes("madrugada")) return "madrugada";
  if (t.includes("manh")) return "manhã";
  if (t.includes("tarde")) return "tarde";
  if (t.includes("noite")) return "noite";
  return null;
}

function dateHintFromIso(iso: string | null): string | null {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return `${Number(m[3])}/${Number(m[2])}`;
}

/** Lê colunas do cabeçalho rolante: Manhã 12/11/2026 | … | Madrugada 13/11/2026 */
function parsePeriodHeaders(headerRowHtml: string): Array<{
  name: DayPeriodName;
  label: string;
  date: string | null;
  dateHint: string | null;
}> {
  const cells = cellTexts(headerRowHtml).slice(1); // 1ª célula costuma ser rótulo vazio
  const out: Array<{
    name: DayPeriodName;
    label: string;
    date: string | null;
    dateHint: string | null;
  }> = [];
  for (const cell of cells) {
    const name = normalizePeriodName(cell);
    if (!name) continue;
    const iso = brDateToIso(cell.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)?.[1] ?? "");
    out.push({
      name,
      label: DAY_PERIOD_LABEL[name],
      date: iso,
      dateHint: dateHintFromIso(iso),
    });
  }
  return out;
}

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

function parseMaxMinCell(raw: string): { min: number | null; max: number | null } {
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

function normalizeZoneName(raw: string): string {
  return polishProse(raw).replace(/\s+/g, " ").trim();
}

export type Previsao24hParsed = AlertaRioDayForecast & {
  periods: ForecastPeriod[];
  zoneTemps: ForecastZoneTemp[];
  synopticNote: string | null;
};

/**
 * Boletim oficial Previsao.html (próximas ~24h por períodos do dia).
 * Aceita HTML de tabela ou markdown (via conversão).
 */
export function parsePrevisao24hHtml(raw: string): Previsao24hParsed | null {
  const html = /<tr\b/i.test(raw) ? raw : markdownTablesToHtml(raw);
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1]);
  if (!rows.length) return null;

  const headerRow =
    rows.find(
      (r) => /madrugada|manh[ãa]|tarde|noite/i.test(r) && /\d{1,2}\/\d{1,2}\/\d{4}/.test(r),
    ) ?? "";
  const periodHeaders = parsePeriodHeaders(headerRow);
  const headerText = stripTags(headerRow);
  const iso =
    periodHeaders.find((p) => p.date)?.date ??
    brDateToIso(headerText.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)?.[1] ?? "");
  if (!iso || !periodHeaders.length) return null;

  const weekday =
    headerText.match(/\b(Seg|Ter|Qua|Qui|Sex|S[aá]b|Dom)\b/i)?.[1] ?? null;
  const byLabel = new Map<string, string[]>();

  for (const row of rows) {
    const texts = cellTexts(row);
    if (texts.length < 2) continue;
    const label = texts[0].toLowerCase();
    // Mantém o alinhamento por índice de coluna (inclui células vazias).
    const values = texts.slice(1);
    if (!values.some(Boolean)) continue;
    if (label.startsWith("céu") || label.startsWith("ceu")) byLabel.set("sky", values);
    else if (label.startsWith("precip")) byLabel.set("precip", values);
    else if (label.startsWith("vento")) byLabel.set("wind", values);
    else if (label.includes("tend") || label.includes("temperatura")) {
      byLabel.set("trend", values);
    }
  }

  // Zonas + temps: linha de nomes seguida da linha Máx./Mín.
  const zoneTemps: ForecastZoneTemp[] = [];
  for (let i = 0; i < rows.length - 1; i++) {
    const names = cellTexts(rows[i]);
    const values = cellTexts(rows[i + 1]);
    if (
      names.length >= 3 &&
      values.length >= 3 &&
      names.every((n) => /barra|centro|tijuca|norte|oeste|sul|zona/i.test(n)) &&
      values.every((v) => /m[aá]x|m[ií]n/i.test(v))
    ) {
      const n = Math.min(names.length, values.length);
      for (let j = 0; j < n; j++) {
        const mm = parseMaxMinCell(values[j]);
        zoneTemps.push({
          zone: normalizeZoneName(names[j]),
          minTempC: mm.min,
          maxTempC: mm.max,
        });
      }
      break;
    }
  }

  // Fallback: agrega min/max da cidade se a linha de zonas não veio estruturada.
  if (!zoneTemps.length) {
    const zoneHits = [
      ...html.matchAll(
        /m[aá]x\.?\s*:?\s*(\d{1,2})\s*°?\s*C[^\d]{0,20}m[ií]n\.?\s*:?\s*(\d{1,2})\s*°?\s*C/gi,
      ),
    ];
    let maxTempC: number | null = null;
    let minTempC: number | null = null;
    for (const m of zoneHits) {
      const max = Number(m[1]);
      const min = Number(m[2]);
      if (Number.isFinite(max)) maxTempC = maxTempC == null ? max : Math.max(maxTempC, max);
      if (Number.isFinite(min)) minTempC = minTempC == null ? min : Math.min(minTempC, min);
    }
    if (minTempC != null || maxTempC != null) {
      zoneTemps.push({ zone: "Rio de Janeiro", minTempC, maxTempC });
    }
  }

  const skyVals = byLabel.get("sky") ?? [];
  const precipVals = byLabel.get("precip") ?? [];
  const windVals = byLabel.get("wind") ?? [];
  const trendVals = byLabel.get("trend") ?? [];

  const periods: ForecastPeriod[] = periodHeaders.map((header, i) => {
    const trendInfo = parseTrend(trendVals[i] ?? "");
    return {
      name: header.name,
      label: header.label,
      date: header.date,
      dateHint: header.dateHint,
      sky: skyVals[i]?.trim() || null,
      precip: precipVals[i]?.trim() || null,
      wind: windVals[i]?.trim() || null,
      tempTrend: trendInfo.trend,
      tempTrendLabel: trendInfo.label,
    };
  });

  let synopticNote: string | null = null;
  const synopticRe = /(descri[cç][aã]o|previs[aã]o)\s+sin[oó]tica/i;
  const synopticHeaderIdx = rows.findIndex((r) => synopticRe.test(stripTags(r)));
  if (synopticHeaderIdx >= 0) {
    const headerTextOnly = stripTags(rows[synopticHeaderIdx]);
    // Às vezes o texto já vem na mesma célula; senão, na linha seguinte.
    const sameCellBody = headerTextOnly
      .replace(/^.*?(descri[cç][aã]o|previs[aã]o)\s+sin[oó]tica[^\d]*\d{0,2}\/?\d{0,2}\/?\d{0,4}\s*/i, "")
      .trim();
    const nextRow = rows[synopticHeaderIdx + 1] ? stripTags(rows[synopticHeaderIdx + 1]) : "";
    const candidate =
      sameCellBody.length > 40
        ? sameCellBody
        : nextRow && !synopticRe.test(nextRow)
          ? nextRow
          : "";
    if (candidate) synopticNote = polishProse(candidate);
  }

  const cityMin = zoneTemps.reduce<number | null>((acc, z) => {
    if (z.minTempC == null) return acc;
    return acc == null ? z.minTempC : Math.min(acc, z.minTempC);
  }, null);
  const cityMax = zoneTemps.reduce<number | null>((acc, z) => {
    if (z.maxTempC == null) return acc;
    return acc == null ? z.maxTempC : Math.max(acc, z.maxTempC);
  }, null);

  const active = pickActivePeriod(periods);
  const dayTrend = pickTrend(trendVals);

  return {
    date: iso,
    weekdayShort: weekday,
    iconFile: null,
    sky: active?.sky ?? null,
    precip: active?.precip ?? null,
    wind: active?.wind ?? null,
    tempTrend: active?.tempTrend ?? dayTrend.trend,
    tempTrendLabel: active?.tempTrendLabel ?? dayTrend.label,
    minTempC: cityMin,
    maxTempC: cityMax,
    periods,
    zoneTemps,
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

  return polishProse(bits.join(". "));
}

function bulletinFromAlertaDay(
  day: AlertaRioDayForecast,
  opts: {
    sourceUrl: string;
    detail24h?: string;
    synoptic?: string | null;
    periods?: ForecastPeriod[];
    zoneTemps?: ForecastZoneTemp[];
  },
): ForecastBulletin {
  const [, month, dayNum] = day.date.split("-");
  const label = weekdayFullLabel(day.weekdayShort, day.date);
  const dateHint = `${Number(dayNum)}/${Number(month)}`;
  const rain = day.precip ? polishProse(day.precip) : null;
  const sky = day.sky ? polishProse(day.sky) : null;
  const wind = day.wind ? polishProse(day.wind) : null;
  const titleBits = [
    `${label} (${dateHint})`,
    rain && !/sem chuva/i.test(rain) ? rain : sky ? `céu ${sky.toLowerCase()}` : null,
    day.maxTempC != null ? `temperatura máxima prevista de ${day.maxTempC}°C` : null,
  ].filter(Boolean);

  const synoptic =
    opts.synoptic && opts.synoptic.length > 20
      ? opts.synoptic
      : polishProse(
          [
            `Previsão oficial do Sistema Alerta Rio para ${label.toLowerCase()} (${dateHint})`,
            sky ? `com céu ${sky.toLowerCase()}` : null,
            rain ? `e ${rain.toLowerCase()}` : null,
          ]
            .filter(Boolean)
            .join(" "),
        );

  const detail24h =
    opts.detail24h ??
    polishProse(
      [
        sky ? `Céu ${sky.toLowerCase()}` : null,
        rain,
        wind ? `Ventos ${wind.toLowerCase()}` : null,
        day.tempTrendLabel
          ? `Temperaturas em ${day.tempTrendLabel.toLowerCase()}`
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
        .join(". "),
    );

  return {
    fetchedAt: new Date().toISOString(),
    source: "live",
    sourceUrl: opts.sourceUrl,
    title: polishProse(titleBits.join(" com ")).replace(/ com temperatura/, " e temperatura"),
    publishedAt: `${day.date}T12:00:00-03:00`,
    synoptic,
    detail24h,
    minTempC: day.minTempC,
    maxTempC: day.maxTempC,
    tempTrend: day.tempTrend,
    tempTrendLabel: day.tempTrendLabel,
    days: [],
    periods: opts.periods,
    zoneTemps: opts.zoneTemps,
  };
}

/** Monta o cartão "Hoje" a partir do boletim oficial de 24h do Alerta Rio. */
export function bulletinFromPrevisao24h(day: Previsao24hParsed): ForecastBulletin {
  return bulletinFromAlertaDay(day, {
    sourceUrl: PREVISAO_24H_PAGE,
    detail24h: detailFromPeriods(day),
    synoptic: day.synopticNote,
    periods: day.periods,
    zoneTemps: day.zoneTemps,
  });
}

/** Fallback: usa o dia de hoje (ou o mais próximo) da Estendida. */
export function bulletinFromEstendidaDay(day: AlertaRioDayForecast): ForecastBulletin {
  return bulletinFromAlertaDay(day, { sourceUrl: PREVISAO_ESTENDIDA_PAGE });
}

/** Cache commitado no repo — atualizado pelo workflow quando o WAF libera o HTML. */
async function loadCachedPrevisao24hHtml(): Promise<string | null> {
  const candidates = [
    join(process.cwd(), "src/lib/alerta-rio/previsao-24h-latest.html"),
    join(process.cwd(), "previsao-24h-latest.html"),
  ];
  for (const path of candidates) {
    try {
      const html = await readFile(path, "utf8");
      if (html.length > 400) return html;
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function fetchPrevisao24h(): Promise<Previsao24hParsed | null> {
  for (const url of [
    PREVISAO_24H_URL,
    "https://alertario.rio.rj.gov.br/upload/Previsao.htm",
    PREVISAO_24H_MIRROR_URL,
    "https://sistema-alerta-rio.com.br/upload/Previsao.html",
  ]) {
    const html = await fetchAlertaHtml(url);
    if (!html) continue;
    const parsed = parsePrevisao24hHtml(html);
    if (parsed) return parsed;
  }

  // Fallback: último boletim espelhado no repositório (GitHub Action).
  const cached = await loadCachedPrevisao24hHtml();
  if (cached) {
    const parsed = parsePrevisao24hHtml(cached);
    if (parsed && !isPrevisao24hStale(parsed)) return parsed;
  }
  return null;
}

/** Aceita cache do dia corrente ou com período que ainda cobre “agora”. */
function isPrevisao24hStale(day: Previsao24hParsed): boolean {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  if (day.date === today) return false;
  if (day.periods?.some((p) => p.date === today)) return false;
  // Permite madrugada do dia seguinte ainda no boletim de ontem.
  if (day.periods?.some((p) => p.date && p.date >= today)) return false;
  return true;
}
