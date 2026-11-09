import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { polishProse } from "./forecast-parse";
import type { ForecastBulletin, ForecastDay, TempTrend } from "./forecast-types";

const execFileAsync = promisify(execFile);

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

/** Prefere declínio/elevação se aparecer em algum período; senão o primeiro válido. */
function pickTrend(values: string[]): { trend: TempTrend | null; label: string | null } {
  const parsed = values.map(parseTrend).filter((t) => t.trend);
  const strong = parsed.find((t) => t.trend === "declinio" || t.trend === "elevacao");
  return strong ?? parsed[0] ?? { trend: null, label: null };
}

/** Um valor representativo (manhã se houver), sem juntar todos os períodos. */
function pickPeriodValue(values: string[], preferIndex = 1): string | null {
  const clean = values.map((v) => v.trim()).filter(Boolean);
  if (!clean.length) return null;
  return clean[Math.min(preferIndex, clean.length - 1)] ?? clean[0] ?? null;
}

/** Precipitação curta e estável para cards (sem "durante… / a partir…"). */
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

  // Cabeçalho com datas (th ou td) — após o título
  const headerRow =
    rows.find(
      (r) =>
        /\d{1,2}\/\d{1,2}\/\d{4}/.test(r) &&
        (/<th\b/i.test(r) || /Seg|Ter|Qua|Qui|Sex|S[aá]b|Dom/i.test(r)),
    ) ?? "";
  const dateCells = [
    ...headerRow.matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi),
  ]
    .map((m) => m[1])
    .slice(1); // ignora primeira célula vazia/rótulo

  const dates = dateCells.map((cell) => {
    const text = stripTags(cell);
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

    // Linha só de máx/mín (às vezes com 1ª célula vazia por rowspan)
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

async function curlAlertaHtml(url: string, referer: string): Promise<string | null> {
  const dir = await mkdtemp(join(tmpdir(), "alerta-html-"));
  const bodyPath = join(dir, "body.html");
  try {
    const { stdout: code } = await execFileAsync(
      "/usr/bin/curl",
      [
        "-sS",
        "-L",
        "--max-time",
        "15",
        "-A",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "-H",
        "Accept: text/html,application/xhtml+xml",
        "-H",
        `Referer: ${referer}`,
        "-o",
        bodyPath,
        "-w",
        "%{http_code}",
        url,
      ],
      { timeout: 20_000, encoding: "utf8" },
    );
    if (String(code).trim() !== "200") return null;
    const html = await readFile(bodyPath, "utf8");
    if (html && /<tr\b/i.test(html) && html.length > 400) return html;
    return null;
  } catch {
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function nodeFetchAlertaHtml(
  url: string,
  referer: string,
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        Referer: referer,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (html && /<tr\b/i.test(html) && html.length > 400) return html;
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Prefer curl on Vercel — Alertario frequentemente bloqueia fetch do Node. */
async function fetchAlertaHtml(url: string, referer: string): Promise<string | null> {
  const viaCurl = await curlAlertaHtml(url, referer);
  if (viaCurl) return viaCurl;
  return nodeFetchAlertaHtml(url, referer);
}

export async function fetchPrevisaoEstendida(): Promise<AlertaRioDayForecast[]> {
  const html = await fetchAlertaHtml(
    PREVISAO_ESTENDIDA_URL,
    "https://alertario.rio.rj.gov.br/4-dias/",
  );
  return html ? parsePrevisaoEstendidaHtml(html) : [];
}

/**
 * Boletim de 24h (Previsao.html) — um dia (em geral o próximo) em períodos.
 * Usado quando a Estendida já começa no dia seguinte e pula a Segunda/hoje.
 */
export function parsePrevisao24hHtml(html: string): AlertaRioDayForecast | null {
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1]);
  if (!rows.length) return null;

  const headerRow =
    rows.find((r) => /madrugada|manh[ãa]|tarde|noite/i.test(r) && /\d{1,2}\/\d{1,2}\/\d{4}/.test(r)) ??
    "";
  const headerText = stripTags(headerRow);
  const iso = brDateToIso(headerText.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)?.[1] ?? "");
  if (!iso) return null;

  const weekday = headerText.match(/\b(Seg|Ter|Qua|Qui|Sex|S[aá]b|Dom)\b/i)?.[1] ?? null;
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
    else if (label.includes("tend") || label.includes("temperatura")) byLabel.set("trend", values);
  }

  // Temps por zona: "Máx.: 24 °C Mín.: 16 °C"
  const zoneTemps = [...html.matchAll(/m[aá]x\.?\s*:?\s*(\d{1,2})\s*°?\s*C[^\d]{0,20}m[ií]n\.?\s*:?\s*(\d{1,2})\s*°?\s*C/gi)];
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
  const trendInfo = pickTrend(byLabel.get("trend") ?? []);

  return {
    date: iso,
    weekdayShort: weekday,
    iconFile: null,
    // Manhã (índice 1) espelha o "dia" melhor que juntar madrugada+tarde+noite.
    sky: pickPeriodValue(skyVals, 1),
    precip: pickPeriodValue(precipVals, 1),
    wind: pickPeriodValue(windVals, 1),
    tempTrend: trendInfo.trend,
    tempTrendLabel: trendInfo.label,
    minTempC,
    maxTempC,
  };
}

export async function fetchPrevisao24h(): Promise<AlertaRioDayForecast | null> {
  const html = await fetchAlertaHtml(
    PREVISAO_24H_URL,
    "https://alertario.rio.rj.gov.br/",
  );
  return html ? parsePrevisao24hHtml(html) : null;
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

  // "12/11 e 13/11" ou "12/11-13/11"
  const multiFull = [
    ...hint.matchAll(/(\d{1,2})\/(\d{1,2})/g),
  ].map((m) => ymd(year, Number(m[2]), Number(m[1])));
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

function compactHint(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return polishProse(stripTags(raw).replace(/\s+/g, " ")) || null;
}

function toForecastDay(
  d: AlertaRioDayForecast,
  corByDate: Map<string, { day: ForecastDay; span: number }>,
): ForecastDay {
  const [, month, dayNum] = d.date.split("-");
  const corHit = corByDate.get(d.date);

  // Sempre prioriza campos estruturados do Alerta Rio (tamanho/conteúdo estáveis).
  // COR só entra como fallback quando a tabela não trouxe o dado.
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

  const corRaw =
    corHit?.day.corDetail ||
    corHit?.day.summary ||
    null;
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

function rioTodayYmd(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Próximos dias = Previsão Estendida do Alerta Rio (sempre 4 dias à frente).
 * O dia atual fica só em "Hoje". Texto do COR entra no detalhe quando houver.
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
    // Fonte canônica: as 4 colunas da Estendida (exceto o dia de hoje, se vier).
    const days = extended
      .filter((d) => d.date > today)
      .map((d) => toForecastDay(d, corByDate));
    return { ...bulletin, days };
  }

  // Fallback sem Estendida: expande ranges do COR ("12/11 e 13/11") em dias futuros.
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
  return { ...bulletin, days: days.slice(0, 4) };
}
