import type { ForecastBulletin, ForecastDay } from "./forecast-types";

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function extractTemps(text: string): { min: number | null; max: number | null } {
  const min =
    text.match(/m[ií]nima(?:\s+prevista)?\s+de\s+(\d+)\s*°?\s*C/i)?.[1] ??
    text.match(/entre\s+(\d+)\s*°?\s*C\s+e\s+(\d+)/i)?.[1];
  const max =
    text.match(/m[aá]xima(?:\s+prevista)?\s+de\s+(\d+)\s*°?\s*C/i)?.[1] ??
    text.match(/entre\s+(\d+)\s*°?\s*C\s+e\s+(\d+)/i)?.[2];
  return {
    min: min ? Number(min) : null,
    max: max ? Number(max) : null,
  };
}

function rainHintFrom(text: string): string | null {
  const t = text.toLowerCase();
  if (t.includes("sem previsão de chuva") || t.includes("sem chuva")) return "Sem chuva";
  if (t.includes("muito forte")) return "Chuva muito forte";
  if (t.includes("chuva forte") || t.includes("moderada a forte")) return "Chuva moderada a forte";
  if (t.includes("chuva fraca a moderada")) return "Chuva fraca a moderada";
  if (t.includes("chuva fraca")) return "Chuva fraca";
  if (t.includes("pancadas")) return "Pancadas de chuva";
  if (t.includes("chuva")) return "Chuva";
  return null;
}

function windHintFrom(text: string): string | null {
  const m = text.match(/ventos?\s+[^.]+/i);
  if (!m) return null;
  return m[0].replace(/\s+/g, " ").replace(/\.$/, "").trim();
}

const DAY_SPLIT =
  /(?=(?:Na\s+)?(?:segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo)(?:-feira)?(?:\s+e\s+(?:na\s+)?(?:segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo)(?:-feira)?)?\s*\()/gi;

function parseNextDays(block: string): ForecastDay[] {
  const parts = block
    .split(DAY_SPLIT)
    .map((p) => p.trim())
    .filter((p) => p.length > 20);

  return parts.map((part) => {
    const header = part.match(
      /^((?:Na\s+)?(?:segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo)(?:-feira)?(?:\s+e\s+(?:na\s+)?(?:segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo)(?:-feira)?)?)\s*\(([^)]+)\)/i,
    );
    const label = header
      ? header[1].replace(/^Na\s+/i, "").replace(/^\w/, (c) => c.toUpperCase())
      : "Próximos dias";
    const dateHint = header?.[2]?.trim() ?? null;
    const body = header ? part.slice(header[0].length).trim() : part;
    const summary = body.replace(/\s+/g, " ").trim();
    return {
      label,
      dateHint,
      summary,
      rainHint: rainHintFrom(summary),
      windHint: windHintFrom(summary),
    };
  });
}

function splitSynopticAndDetail(todayBlock: string): { synoptic: string; detail24h: string } {
  const cleaned = todayBlock
    .replace(/^De acordo com o Sistema Alerta Rio,\s*/i, "")
    .replace(/^Segundo (?:o |o Sistema )?Alerta Rio,\s*/i, "")
    .replace(/^Ainda de acordo com o Alerta Rio,\s*/i, "")
    .trim();

  // Synoptic cue: weather systems in the first sentence(s)
  const sentences = cleaned.split(/(?<=\.)\s+/).filter(Boolean);
  if (sentences.length <= 1) {
    return { synoptic: cleaned, detail24h: cleaned };
  }

  const synopticBits: string[] = [];
  const detailBits: string[] = [];
  for (const s of sentences) {
    const isSynoptic =
      /frente fria|baixa press[aã]o|ventos? [uú]midos|oceano|instabilidade|sistema|massas? de ar|circula[cç][aã]o/i.test(
        s,
      ) && !/c[eé]u |chuva |rajadas|temperatura|m[ií]nima|m[aá]xima/i.test(s);
    if (isSynoptic && detailBits.length === 0) synopticBits.push(s);
    else detailBits.push(s);
  }

  if (!synopticBits.length) {
    return {
      synoptic: sentences[0],
      detail24h: sentences.slice(1).join(" ") || sentences[0],
    };
  }

  return {
    synoptic: synopticBits.join(" "),
    detail24h: detailBits.join(" ") || synopticBits.join(" "),
  };
}

export function isForecastPost(title: string, contentHtml: string): boolean {
  const t = title.toLowerCase();
  if (/est[aá]gio|protocolo de calor|calor \d|retornou ao/.test(t)) return false;
  const text = stripHtml(contentHtml).toLowerCase();
  return (
    /alerta rio/.test(text) &&
    (/previs[aã]o/.test(text) || /c[eé]u /.test(text) || /chuva/.test(text)) &&
    (/pr[oó]ximos dias|segunda-feira|m[ií]nima|m[aá]xima/.test(text) ||
      /parcialmente nublado|encoberto|nebulosidade/.test(text))
  );
}

export function parseForecastHtml(input: {
  title: string;
  html: string;
  link: string;
  publishedAt: string;
}): ForecastBulletin {
  const text = stripHtml(input.html);
  const splitMarker =
    /confira previs[aã]o para os pr[oó]ximos dias|previs[aã]o para os pr[oó]ximos dias|como fica o tempo/i;
  const [todayRaw, nextRaw = ""] = text.split(splitMarker);
  const todayBlock = (todayRaw ?? text).trim();
  const { synoptic, detail24h } = splitSynopticAndDetail(todayBlock);
  const temps = extractTemps(todayBlock);
  const days = parseNextDays(nextRaw.trim());

  return {
    fetchedAt: new Date().toISOString(),
    source: "live",
    sourceUrl: input.link,
    title: input.title,
    publishedAt: input.publishedAt,
    synoptic,
    detail24h,
    minTempC: temps.min,
    maxTempC: temps.max,
    days,
  };
}
