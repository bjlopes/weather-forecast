import { parseForecastHtml, isForecastPost } from "./forecast-parse";
import { SAMPLE_FORECAST } from "./forecast-sample";
import type { ForecastBulletin } from "./forecast-types";
import { getHourlyForecast } from "./hourly-fetch";

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

export async function getForecastBulletin(): Promise<ForecastBulletin> {
  const hourly = await getHourlyForecast();

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
    const match = posts.find((p) =>
      isForecastPost(decodeTitle(p.title.rendered), p.content.rendered),
    );
    if (!match) throw new Error("Nenhum boletim de previsão encontrado");

    const bulletin = parseForecastHtml({
      title: decodeTitle(match.title.rendered),
      html: match.content.rendered,
      link: match.link,
      publishedAt: match.date,
    });

    if (!bulletin.synoptic && !bulletin.detail24h) {
      throw new Error("Boletim sem texto utilizável");
    }
    return { ...bulletin, hourly };
  } catch {
    return {
      ...SAMPLE_FORECAST,
      fetchedAt: new Date().toISOString(),
      source: "sample",
      hourly,
    };
  }
}
