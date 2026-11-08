import type { ForecastBulletin } from "./forecast-types";

/** Snapshot from COR/Alerta Rio bulletin (08/11/2026) + Previsão Estendida. */
export const SAMPLE_FORECAST: ForecastBulletin = {
  fetchedAt: "2026-11-08T08:47:34.000Z",
  source: "sample",
  sourceUrl:
    "https://cor.rio/domingo-com-possibilidade-de-chuva-fraca-a-moderada-e-temperatura-maxima-prevista-de-27oc/",
  title:
    "Domingo com possibilidade de chuva fraca a moderada e temperatura máxima prevista de 27ºC",
  publishedAt: "2026-11-08T05:47:34",
  synoptic:
    "Deslocamento de uma frente fria e posterior entrada de ventos úmidos do oceano mantêm o tempo instável na cidade do Rio.",
  detail24h:
    "O céu estará parcialmente nublado a encoberto, com previsão de chuva fraca a moderada ao longo do dia. Até o período da manhã há previsão de rajadas de vento de intensidade moderada a forte, perdendo intensidade a partir da tarde. As temperaturas apresentarão acentuado declínio, com mínima prevista de 17°C e máxima de 27°C.",
  minTempC: 17,
  maxTempC: 27,
  tempTrend: "declinio",
  tempTrendLabel: "Acentuado declínio",
  days: [
    {
      label: "Segunda-feira",
      dateHint: "9/11",
      summary:
        "Céu nublado a encoberto. Chuva fraca a moderada isolada durante a madrugada/manhã. Ventos fraco a moderado de SE/S.",
      rainHint: "Chuva fraca a moderada isolada durante a madrugada/manhã",
      windHint: "Fraco a Moderado de SE/S",
      minTempC: 16,
      maxTempC: 24,
      tempTrend: "declinio",
      iconUrl: null,
      skyHint: "Nublado a Encoberto",
    },
    {
      label: "Terça-feira",
      dateHint: "10/11",
      summary:
        "Céu nublado. Chuvisco/chuva fraca isolada durante a madrugada/manhã. Ventos moderado de E/SE.",
      rainHint: "Chuvisco/Chuva Fraca isolada durante a madrugada/manhã",
      windHint: "Moderado de E/SE",
      minTempC: 16,
      maxTempC: 27,
      tempTrend: "elevacao",
      iconUrl: null,
      skyHint: "Nublado",
    },
    {
      label: "Quarta-feira",
      dateHint: "11/11",
      summary:
        "Céu nublado a parcialmente nublado. Chuvisco/chuva fraca isolada durante a tarde/noite. Ventos moderado de E/SE.",
      rainHint: "Chuvisco/Chuva Fraca isolada durante a tarde/noite",
      windHint: "Moderado de E/SE",
      minTempC: 16,
      maxTempC: 29,
      tempTrend: "estavel",
      iconUrl: null,
      skyHint: "Nublado a Parcialmente Nublado",
    },
    {
      label: "Quinta-feira",
      dateHint: "12/11",
      summary:
        "Céu parcialmente nublado a nublado. Chuva fraca a moderada isolada a partir da tarde. Ventos fraco a moderado de E/SE.",
      rainHint: "Chuva fraca a moderada isolada a partir da tarde",
      windHint: "Fraco a Moderado de E/SE",
      minTempC: 17,
      maxTempC: 30,
      tempTrend: "estavel",
      iconUrl: null,
      skyHint: "Parcialmente Nublado a Nublado",
    },
  ],
};
