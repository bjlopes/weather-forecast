import { enrichDaysFromAlertaRio } from "./enrich-days";
import {
  parseForecastHtml,
  isForecastPost,
  mergeTemperatureFields,
} from "./forecast-parse";
import { SAMPLE_FORECAST } from "./forecast-sample";
import type { ForecastBulletin } from "./forecast-types";

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

export async function getForecastBulletin(): Promise<ForecastBulletin> {
  try {
    const res = await fetch(COR_POSTS_URL, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; WeatherForecast/1.0)",
      },
    });
    if (!res.ok) throw new Error(`COR API ${res.status}`);
    const posts = (await res.json()) as WpPost[];

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

    if (!bulletins.length) throw new Error("Nenhum boletim de previsão encontrado");

    let primary = bulletins[0];
    if (!primary.synoptic && !primary.detail24h) {
      throw new Error("Boletim sem texto utilizável");
    }

    // Atualizações curtas (ex.: noite) às vezes omitem mín/máx/tendência —
    // completa com boletim anterior do mesmo dia no Rio.
    if (!hasTemperatureInfo(primary)) {
      const day = rioDayKey(primary.publishedAt);
      const donor = bulletins.find(
        (b, i) => i > 0 && rioDayKey(b.publishedAt) === day && hasTemperatureInfo(b),
      );
      if (donor) primary = mergeTemperatureFields(primary, donor);
    }

    return enrichDaysFromAlertaRio(primary);
  } catch {
    return enrichDaysFromAlertaRio({
      ...SAMPLE_FORECAST,
      fetchedAt: new Date().toISOString(),
      source: "sample",
    });
  }
}
