import { enrichDaysFromAlertaRio } from "./enrich-days";
import { fetchPrevisaoEstendida } from "./estendida-fetch";
import {
  parseForecastHtml,
  isForecastPost,
  mergeTemperatureFields,
} from "./forecast-parse";
import { SAMPLE_FORECAST } from "./forecast-sample";
import type { ForecastBulletin } from "./forecast-types";
import {
  bulletinFromEstendidaDay,
  bulletinFromPrevisao24h,
  fetchPrevisao24h,
} from "./previsao-24h";

const COR_POSTS_URL =
  "https://cor.rio/wp-json/wp/v2/posts?categories=29&per_page=8&_fields=id,date,slug,link,title,content";

interface WpPost {
  id: number;
  date: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string };
}

function decodeTitle(raw: string): string {
  return raw
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function rioDayKey(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function hasTemperatureInfo(b: ForecastBulletin): boolean {
  return (
    b.minTempC != null ||
    b.maxTempC != null ||
    b.tempTrend != null ||
    /temperaturas?|m[ií]nima|m[aá]xima|decl[ií]nio|eleva[cç][aã]o/i.test(
      `${b.detail24h} ${b.synoptic} ${b.title}`,
    )
  );
}

function isStaleForToday(publishedAt: string, now = new Date()): boolean {
  return rioDayKey(publishedAt) < rioDayKey(now.toISOString());
}

async function fetchCorBulletin(): Promise<ForecastBulletin | null> {
  try {
    const res = await fetch(COR_POSTS_URL, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; WeatherForecast/1.0)",
        "Accept-Language": "pt-BR,pt;q=0.9",
        Referer: "https://cor.rio/",
      },
    });
    if (!res.ok) return null;
    const posts = (await res.json()) as WpPost[];
    if (!Array.isArray(posts) || !posts.length) return null;

    const bulletins = posts
      .filter((p) => isForecastPost(decodeTitle(p.title.rendered), p.content.rendered))
      .map((p) =>
        parseForecastHtml({
          title: decodeTitle(p.title.rendered),
          html: p.content.rendered,
          link: p.link,
          publishedAt: p.date,
        }),
      );

    if (!bulletins.length) return null;

    let primary = bulletins[0];
    if (!primary.synoptic && !primary.detail24h) return null;

    if (!hasTemperatureInfo(primary)) {
      const day = rioDayKey(primary.publishedAt);
      const donor = bulletins.find(
        (b, i) => i > 0 && rioDayKey(b.publishedAt) === day && hasTemperatureInfo(b),
      );
      if (donor) primary = mergeTemperatureFields(primary, donor);
    }

    return primary;
  } catch {
    return null;
  }
}

async function fetchAlertaTodayBulletin(): Promise<ForecastBulletin | null> {
  try {
    const day24 = await fetchPrevisao24h();
    if (day24) return bulletinFromPrevisao24h(day24);

    // Previsao.html costuma estar no WAF; Estendida (Node) ainda libera no Vercel.
    const extended = await fetchPrevisaoEstendida();
    if (!extended.length) return null;
    const today = rioDayKey(new Date().toISOString());
    const todayHit = extended.find((d) => d.date === today);
    const pick = todayHit ?? extended[0];
    return bulletinFromEstendidaDay(pick);
  } catch {
    return null;
  }
}

export async function getForecastBulletin(): Promise<ForecastBulletin> {
  const fromCor = await fetchCorBulletin();
  if (fromCor && !isStaleForToday(fromCor.publishedAt)) {
    return enrichDaysFromAlertaRio(fromCor);
  }

  const fromAlerta = await fetchAlertaTodayBulletin();
  if (fromAlerta) {
    return enrichDaysFromAlertaRio(fromAlerta);
  }

  if (fromCor) {
    return enrichDaysFromAlertaRio(fromCor);
  }

  return enrichDaysFromAlertaRio({
    ...SAMPLE_FORECAST,
    fetchedAt: new Date().toISOString(),
    source: "sample",
  });
}
