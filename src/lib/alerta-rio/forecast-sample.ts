import type { ForecastBulletin } from "./forecast-types";

/**
 * Amostra alinhada ao boletim 24h (quando live + cache falham).
 * Mantém períodos / zonas / sinótica para o cartão Hoje não ficar vazio.
 */
export const SAMPLE_FORECAST: ForecastBulletin = {
  fetchedAt: "2026-11-14T13:00:00.000Z",
  source: "sample",
  sourceUrl: "https://alertario.rio.rj.gov.br/24-horas/",
  title:
    "Sábado (14/11) com chuva fraca isolada e temperatura máxima prevista de 29°C.",
  publishedAt: "2026-11-14T12:00:00-03:00",
  synoptic:
    "Neste sábado, o tempo na cidade do Rio de Janeiro será influenciado pela entrada de ventos úmidos do oceano. Assim, a previsão é de céu nublado a parcialmente nublado e chuva fraca isolada até o período da tarde. Os ventos estarão moderados e as temperaturas apresentarão declínio, com máxima de 29°C.",
  detail24h:
    "Na tarde, céu nublado a parcialmente nublado, chuva fraca isolada, ventos moderado de S/SW. Na noite, céu nublado a parcialmente nublado, sem chuva. Na madrugada, céu parcialmente nublado a nublado, sem chuva. Na manhã, céu parcialmente nublado a nublado, sem chuva.",
  minTempC: 20,
  maxTempC: 29,
  tempTrend: "declinio",
  tempTrendLabel: "Declínio",
  periods: [
    {
      name: "tarde",
      label: "Tarde",
      date: "2026-11-14",
      dateHint: "14/11",
      sky: "Nublado a Parcialmente Nublado",
      precip: "Chuva fraca isolada",
      wind: "Moderado de S/SW",
      tempTrend: "declinio",
      tempTrendLabel: "Declínio",
    },
    {
      name: "noite",
      label: "Noite",
      date: "2026-11-14",
      dateHint: "14/11",
      sky: "Nublado a Parcialmente Nublado",
      precip: "Sem chuva",
      wind: "Fraco a Moderado de SW/W",
      tempTrend: "estavel",
      tempTrendLabel: "Estável",
    },
    {
      name: "madrugada",
      label: "Madrugada",
      date: "2026-11-15",
      dateHint: "15/11",
      sky: "Parcialmente Nublado a Nublado",
      precip: "Sem chuva",
      wind: "Fraco a Moderado de W/NW",
      tempTrend: "estavel",
      tempTrendLabel: "Estável",
    },
    {
      name: "manhã",
      label: "Manhã",
      date: "2026-11-15",
      dateHint: "15/11",
      sky: "Parcialmente Nublado a Nublado",
      precip: "Sem chuva",
      wind: "Fraco a Moderado de NE/E",
      tempTrend: "estavel",
      tempTrendLabel: "Estável",
    },
  ],
  zoneTemps: [
    { zone: "Barra/Jacarepaguá", minTempC: 20, maxTempC: 29 },
    { zone: "Centro/Grande Tijuca", minTempC: 20, maxTempC: 28 },
    { zone: "Zona Norte", minTempC: 23, maxTempC: 28 },
    { zone: "Zona Oeste", minTempC: 21, maxTempC: 29 },
    { zone: "Zona Sul", minTempC: 23, maxTempC: 27 },
  ],
  days: [
    {
      label: "Domingo",
      dateHint: "15/11",
      summary:
        "Céu parcialmente nublado a nublado. Pancadas de chuva isoladas a partir do final da tarde. Ventos moderado de e/se.",
      rainHint: "Pancadas de chuva isoladas a partir do final da tarde",
      windHint: "Moderado de E/SE",
      minTempC: 17,
      maxTempC: 31,
      tempTrend: "estavel",
      iconUrl: null,
      skyHint: "Parcialmente Nublado a Nublado",
      corDetail: null,
    },
    {
      label: "Segunda-feira",
      dateHint: "16/11",
      summary:
        "Céu nublado a parcialmente nublado. Chuva fraca a moderada isolada durante a madrugada/manhã. Ventos fraco a moderado de e/se.",
      rainHint: "Chuva fraca a moderada isolada durante a madrugada/manhã",
      windHint: "Fraco a Moderado de E/SE",
      minTempC: 18,
      maxTempC: 29,
      tempTrend: "estavel",
      iconUrl: null,
      skyHint: "Nublado a Parcialmente Nublado",
      corDetail: null,
    },
    {
      label: "Terça-feira",
      dateHint: "17/11",
      summary:
        "Céu nublado a parcialmente nublado. Sem chuva. Ventos fraco a moderado de e/se.",
      rainHint: "Sem chuva",
      windHint: "Fraco a Moderado de E/SE",
      minTempC: 19,
      maxTempC: 30,
      tempTrend: "estavel",
      iconUrl: null,
      skyHint: "Nublado a Parcialmente Nublado",
      corDetail: null,
    },
    {
      label: "Quarta-feira",
      dateHint: "18/11",
      summary:
        "Céu nublado a parcialmente nublado. Sem chuva. Ventos moderado de e/se.",
      rainHint: "Sem chuva",
      windHint: "Moderado de E/SE",
      minTempC: 19,
      maxTempC: 33,
      tempTrend: "elevacao",
      iconUrl: null,
      skyHint: "Nublado a Parcialmente Nublado",
      corDetail: null,
    },
  ],
};
