import type { ForecastBulletin } from "./forecast-types";

/** Amostra alinhada à Estendida (4 dias à frente — Ter→Sex). */
export const SAMPLE_FORECAST: ForecastBulletin = {
  fetchedAt: "2026-11-09T12:00:00.000Z",
  source: "sample",
  sourceUrl:
    "https://cor.rio/segunda-feira-09-11-com-previsao-de-chuva-fraca-a-moderada-e-temperatura-maxima-prevista-de-23oc/",
  title:
    "Segunda-feira (09/11) com chuva fraca a moderada e temperatura máxima prevista de 23ºC.",
  publishedAt: "2026-11-09T06:30:54",
  synoptic:
    "Nesta segunda-feira (09/11), o tempo permanece instável na cidade do Rio devido à entrada de ventos úmidos do oceano.",
  detail24h:
    "A previsão é de predomínio de céu encoberto e chuva fraca a moderada isolada no período da manhã, passando a chuva fraca isolada a partir da tarde. Os ventos estarão fracos a moderados e as temperaturas apresentarão declínio, com mínima prevista de 16°C e máxima de 23°C.",
  minTempC: 16,
  maxTempC: 23,
  tempTrend: "declinio",
  tempTrendLabel: "Declínio",
  days: [
    {
      label: "Terça-feira",
      dateHint: "10/11",
      summary:
        "Céu nublado. Chuvisco/chuva fraca isolada durante a madrugada/manhã. Ventos moderado de E/SE.",
      rainHint: "Chuvisco/Chuva Fraca isolada",
      windHint: "Moderado de E/SE",
      minTempC: 16,
      maxTempC: 26,
      tempTrend: "elevacao",
      iconUrl: null,
      skyHint: "Nublado",
      corDetail:
        "O tempo permanece instável devido à entrada de ventos úmidos do oceano. Assim, a previsão é de céu nublado e chuvisco/chuva fraca isolada na madrugada/manhã. Os ventos estarão fracos a moderados.",
    },
    {
      label: "Quarta-feira",
      dateHint: "11/11",
      summary:
        "Céu nublado a parcialmente nublado. Chuvisco/chuva fraca isolada durante a tarde/noite. Ventos moderado de E/SE.",
      rainHint: "Chuvisco/Chuva Fraca isolada",
      windHint: "Moderado de E/SE",
      minTempC: 16,
      maxTempC: 28,
      tempTrend: "estavel",
      iconUrl: null,
      skyHint: "Nublado a Parcialmente Nublado",
      corDetail:
        "Ventos úmidos associados do oceano seguem influenciando o tempo, com céu nublado a parcialmente nublado e previsão de chuvisco/chuva fraca isolada entre a tarde/noite. Os ventos estarão moderados durante a tarde/noite.",
    },
    {
      label: "Quinta-feira",
      dateHint: "12/11",
      summary:
        "Céu parcialmente nublado a nublado. Chuva fraca a moderada isolada a partir da tarde. Ventos fraco a moderado de E/SE.",
      rainHint: "Chuva fraca a moderada isolada",
      windHint: "Fraco a Moderado de E/SE",
      minTempC: 17,
      maxTempC: 30,
      tempTrend: "estavel",
      iconUrl: null,
      skyHint: "Parcialmente Nublado a Nublado",
      corDetail: null,
    },
    {
      label: "Sexta-feira",
      dateHint: "13/11",
      summary:
        "Céu parcialmente nublado a nublado. Chuva fraca a moderada isolada a qualquer momento. Ventos moderado de SW/W.",
      rainHint: "Chuva fraca a moderada isolada",
      windHint: "Moderado de SW/W",
      minTempC: 18,
      maxTempC: 28,
      tempTrend: "estavel",
      iconUrl: null,
      skyHint: "Parcialmente Nublado a Nublado",
      corDetail: null,
    },
  ],
};
