import type { ForecastBulletin, ForecastDay, TempTrend } from "./forecast-types";

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
  const normalized = text.replace(/º/g, "°").replace(/\boC\b/gi, "°C");
  const minMatch =
    normalized.match(
      /m[ií]nima(?:\s+prevista)?(?:\s+de)?\s+(\d{1,2})\s*(?:°\s*C|°C|C\b)/i,
    ) ??
    normalized.match(/m[ií]nima(?:\s+prevista)?(?:\s+de)?\s+(\d{1,2})/i) ??
    normalized.match(/entre\s+(\d{1,2})\s*(?:°\s*C|°C)?\s+e\s+(\d{1,2})/i);
  const maxMatch =
    normalized.match(
      /m[aá]xima(?:\s+prevista)?(?:\s+de)?\s+(\d{1,2})\s*(?:°\s*C|°C|C\b)/i,
    ) ??
    normalized.match(
      /temperatura\s+m[aá]xima(?:\s+prevista)?(?:\s+de)?\s+(\d{1,2})\s*(?:°\s*C|°C|C\b)?/i,
    ) ??
    normalized.match(/m[aá]xima(?:\s+prevista)?(?:\s+de)?\s+(\d{1,2})/i) ??
    normalized.match(/entre\s+(\d{1,2})\s*(?:°\s*C|°C)?\s+e\s+(\d{1,2})/i);

  const minRaw = minMatch?.[1] ?? null;
  const maxRaw =
    maxMatch && maxMatch[0].toLowerCase().includes("entre")
      ? maxMatch[2]
      : (maxMatch?.[1] ?? maxMatch?.[2] ?? null);

  const min = minRaw != null ? Number(minRaw) : null;
  const max = maxRaw != null ? Number(maxRaw) : null;
  return {
    min: min != null && min >= 5 && min <= 45 ? min : null,
    max: max != null && max >= 5 && max <= 50 ? max : null,
  };
}

export function extractTempTrend(text: string): {
  trend: TempTrend | null;
  label: string | null;
} {
  const t = text.toLowerCase();
  if (
    /acentuado\s+decl[ií]nio|forte\s+decl[ií]nio|decl[ií]nio\s+acentuado|temperaturas?\s+[^\.]{0,40}decl[ií]nio|em\s+decl[ií]nio|devem\s+cair|queda\s+(?:nas\s+)?temperaturas|esfriamento/i.test(
      t,
    )
  ) {
    const accented = /acentuado|forte/.test(t);
    return {
      trend: "declinio",
      label: accented ? "Acentuado declínio" : "Declínio",
    };
  }
  if (
    /em\s+eleva[cç][aã]o|temperaturas?\s+[^\.]{0,40}eleva|aumento\s+(?:nas\s+)?temperaturas|devem\s+subir|aqueciment|eleva[cç][aã]o\s+(?:das|nas)\s+temperaturas/i.test(
      t,
    )
  ) {
    return { trend: "elevacao", label: "Elevação" };
  }
  if (
    /temperaturas?\s+[^\.]{0,40}est[aá]ve|permanecem\s+est[aá]ve|sem\s+varia[cç][aã]o|estabilidade\s+t[eé]rmica|pouca\s+varia[cç][aã]o/i.test(
      t,
    )
  ) {
    return { trend: "estavel", label: "Estáveis" };
  }
  return { trend: null, label: null };
}

/** Frase do boletim sobre temperaturas (para complementar o detalhe do dia). */
export function extractTempSentence(text: string): string | null {
  const sentences = text.split(/(?<=\.)\s+/).filter(Boolean);
  const hit = sentences.find((s) =>
    /temperaturas?|m[ií]nima|m[aá]xima|decl[ií]nio|eleva[cç][aã]o/i.test(s),
  );
  return hit ? polishProse(hit) : null;
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
  return polishProse(m[0].replace(/\s+/g, " ").replace(/\.$/, "").trim());
}

/** Corrige restos de split (vírgula/minúscula no início) e tipografia básica. */
export function polishProse(text: string): string {
  let s = text
    .replace(/\u00a0/g, " ")
    .replace(/[\u200b\u200c\u200d\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  // Hashtags de divulgação no fim do boletim
  s = s.replace(/(?:^|\s)#[\p{L}\p{N}_]+/gu, " ").replace(/\s+/g, " ").trim();
  // Título WP: "… chuva fraca | Confira os próximos dias"
  s = s.replace(/\s*[|–—-]\s*Confira(?:\s+os)?\s+pr[oó]ximos\s+dias\.?$/i, "");
  // Corta qualquer lixo até a primeira letra (vírgula, ponto, aspas, espaços…)
  s = s.replace(/^[^\p{L}]+/u, "");
  if (!s) return "";
  // Maiúscula na primeira letra (respeita acentos)
  s = s.replace(/^\p{L}/u, (c) => c.toLocaleUpperCase("pt-BR"));
  // Espaço após pontuação de frase quando faltar: "instável.A previsão"
  s = s.replace(/([.!?])(\p{L})/gu, "$1 $2");
  // Espaços antes de vírgula/ponto
  s = s.replace(/\s+([,;:.!?])/g, "$1");
  // Vírgula/ponto-e-vírgula grudados na palavra seguinte
  s = s.replace(/([,;:])(\S)/g, "$1 $2");
  // Maiúscula após fim de frase
  s = s.replace(/([.!?…]\s+)(\p{Ll})/gu, (_, sep: string, ch: string) =>
    `${sep}${ch.toLocaleUpperCase("pt-BR")}`,
  );
  // Fecha com ponto se parecer frase completa sem terminação
  if (!/[.!?…]$/.test(s) && s.length > 40 && /\s/.test(s)) {
    s = `${s}.`;
  }
  return s.trim();
}

const DAY_SPLIT =
  /(?=(?:Na\s+)?(?:segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo)(?:-feira)?(?:\s+e\s+(?:na\s+)?(?:segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo)(?:-feira)?)?\s*\()/gi;

function parseNextDays(block: string): ForecastDay[] {
  const parts = block
    .split(DAY_SPLIT)
    .map((p) => p.trim())
    .filter((p) => p.length > 20);

  return parts.map((part) => {
    // Consome também a vírgula após a data: "Terça-feira (9 e 10/11), o tempo…"
    const header = part.match(
      /^((?:Na\s+)?(?:segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo)(?:-feira)?(?:\s+e\s+(?:na\s+)?(?:segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo)(?:-feira)?)?)\s*\(([^)]+)\)\s*[,:;.\-–—]?\s*/i,
    );
    const label = header
      ? header[1].replace(/^Na\s+/i, "").replace(/^\w/, (c) => c.toUpperCase())
      : "Próximos dias";
    const dateHint = header?.[2]?.trim() ?? null;
    const body = header ? part.slice(header[0].length).trim() : part;
    const summary = polishProse(body);
    const temps = extractTemps(summary);
    const trend = extractTempTrend(summary);
    return {
      label: polishProse(label.replace(/\s+/g, " ")),
      dateHint,
      summary,
      rainHint: rainHintFrom(summary),
      windHint: windHintFrom(summary),
      minTempC: temps.min,
      maxTempC: temps.max,
      tempTrend: trend.trend,
      iconUrl: null,
      skyHint: null,
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
  const combined = `${input.title}\n${todayBlock}`;
  const { synoptic, detail24h } = splitSynopticAndDetail(todayBlock);
  const temps = extractTemps(combined);
  const trend = extractTempTrend(combined);
  const days = parseNextDays(nextRaw.trim());

  return {
    fetchedAt: new Date().toISOString(),
    source: "live",
    sourceUrl: input.link,
    title: polishProse(input.title),
    publishedAt: input.publishedAt,
    synoptic: polishProse(synoptic),
    detail24h: polishProse(detail24h),
    minTempC: temps.min,
    maxTempC: temps.max,
    tempTrend: trend.trend,
    tempTrendLabel: trend.label,
    days,
  };
}

/** Completa mín/máx/tendência a partir de outro boletim (ex.: atualização noturna sem números). */
export function mergeTemperatureFields(
  primary: ForecastBulletin,
  donor: ForecastBulletin,
): ForecastBulletin {
  const minTempC = primary.minTempC ?? donor.minTempC;
  const maxTempC = primary.maxTempC ?? donor.maxTempC;
  const tempTrend = primary.tempTrend ?? donor.tempTrend;
  const tempTrendLabel = primary.tempTrendLabel ?? donor.tempTrendLabel;

  let detail24h = primary.detail24h;
  const lacksTempTalk = !/temperaturas?|m[ií]nima|m[aá]xima|decl[ií]nio|eleva[cç][aã]o/i.test(
    detail24h,
  );
  if (lacksTempTalk) {
    const sentence = extractTempSentence(`${donor.detail24h} ${donor.synoptic}`)
      ?? (tempTrendLabel || minTempC != null || maxTempC != null
        ? [
            tempTrendLabel ? `As temperaturas apresentam ${tempTrendLabel.toLowerCase()}` : null,
            minTempC != null || maxTempC != null
              ? `com ${[
                  minTempC != null ? `mínima prevista de ${minTempC}°C` : null,
                  maxTempC != null ? `máxima de ${maxTempC}°C` : null,
                ]
                  .filter(Boolean)
                  .join(" e ")}`
              : null,
          ]
            .filter(Boolean)
            .join(", ") + "."
        : null);
    if (sentence) {
      detail24h = polishProse(`${detail24h} ${sentence}`);
    }
  }

  return {
    ...primary,
    minTempC,
    maxTempC,
    tempTrend,
    tempTrendLabel,
    detail24h,
  };
}
