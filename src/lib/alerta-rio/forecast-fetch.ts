import { enrichDaysFromAlertaRio } from "./enrich-days";
import {
  parseForecastHtml,
  isForecastPost,
  mergeTemperatureFields,
} from "./forecast-parse";
import { SAMPLE_FORECAST } from "./forecast-sample";
import type { ForecastBulletin } from "./forecast-types";
import {
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
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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
    const day = await fetchPrevisao24h();
    if (!day) return null;
    return bulletinFromPrevisao24h(day);
  } catch {
    return null;
  }
}

export async function getForecastBulletin(): Promise<ForecastBulletin> {
  const fromCor = await fetchCorBulletin();
  // COR às vezes responde, mas com boletim de dias anteriores — nesse caso
  // preferimos o Previsao.html do Alerta Rio (atualizado com mais frequência).
  if (fromCor && !isStaleForToday(fromCor.publishedAt)) {
    return enrichDaysFromAlertaRio(fromCor);
  }

  const fromAlerta = await fetchAlertaTodayBulletin();
  if (fromAlerta) {
    // Se o COR trouxe texto útil do mesmo ciclo, podemos complementar depois —
    // por ora o boletim 24h oficial é a fonte viva de "Hoje".
    return enrichDaysFromAlertaRio(fromAlerta);
  }

  if (fromCor) {
    // Melhor um COR atrasado do que a amostra estática.
    return enrichDaysFromAlertaRio(fromCor);
  }

  return enrichDaysFromAlertaRio({
    ...SAMPLE_FORECAST,
    fetchedAt: new Date().toISOString(),
    source: "sample",
  });
}
