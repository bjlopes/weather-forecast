import type { ForecastBulletin } from "./forecast-types";

/**
 * Amostra alinhada ao boletim 24h (quando live + cache falham).
 * Mantém períodos / zonas / sinótica para o cartão Hoje não ficar vazio.
 */
export const SAMPLE_FORECAST: ForecastBulletin = {
  fetchedAt: "2026-11-12T12:00:00.000Z",
  source: "sample",
  sourceUrl: "https://alertario.rio.rj.gov.br/24-horas/",
  title:
    "Quinta-feira (12/11) com pancadas de chuva isoladas e temperatura máxima prevista de 34°C.",
  publishedAt: "2026-11-12T12:00:00-03:00",
  synoptic:
    "Nesta quinta-feira, áreas de instabilidade associadas à formação de uma região de baixa pressão deixarão o tempo instável na cidade do Rio, com previsão de nebulosidade variada e pancadas de chuva isoladas a partir da tarde, podendo vir acompanhadas de raios. Os ventos estarão predominantemente moderados ao longo do dia e as temperaturas se manterão estáveis, com mínima prevista de 18°C e máxima de 34°C.",
  detail24h:
    "Na manhã, céu nublado a parcialmente nublado, sem chuva, ventos moderado de N/NE. Na tarde, céu nublado a parcialmente nublado, pancadas de chuva isoladas, ventos moderado de NE/E. Na noite, céu parcialmente nublado a nublado, pancadas de chuva isoladas. Na madrugada, céu parcialmente nublado a nublado, pancadas de chuva isoladas.",
  minTempC: 18,
  maxTempC: 34,
  tempTrend: "estavel",
  tempTrendLabel: "Estável",
  periods: [
    {
      name: "manhã",
      label: "Manhã",
      date: "2026-11-12",
      dateHint: "12/11",
      sky: "Nublado a Parcialmente Nublado",
      precip: "Sem chuva",
      wind: "Moderado de N/NE",
      tempTrend: "estavel",
      tempTrendLabel: "Estável",
    },
    {
      name: "tarde",
      label: "Tarde",
      date: "2026-11-12",
      dateHint: "12/11",
      sky: "Nublado a Parcialmente Nublado",
      precip: "Pancadas de chuva isoladas",
      wind: "Moderado de NE/E",
      tempTrend: "estavel",
      tempTrendLabel: "Estável",
    },
    {
      name: "noite",
      label: "Noite",
      date: "2026-11-12",
      dateHint: "12/11",
      sky: "Parcialmente Nublado a Nublado",
      precip: "Pancadas de chuva isoladas",
      wind: "Moderado de NE/E",
      tempTrend: "estavel",
      tempTrendLabel: "Estável",
    },
    {
      name: "madrugada",
      label: "Madrugada",
      date: "2026-11-13",
      dateHint: "13/11",
      sky: "Parcialmente Nublado a Nublado",
      precip: "Pancadas de chuva isoladas",
      wind: "Fraco a Moderado de SW/W",
      tempTrend: "estavel",
      tempTrendLabel: "Estável",
    },
  ],
  zoneTemps: [
    { zone: "Barra/Jacarepaguá", minTempC: 19, maxTempC: 33 },
    { zone: "Centro/Grande Tijuca", minTempC: 18, maxTempC: 32 },
    { zone: "Zona Norte", minTempC: 20, maxTempC: 34 },
    { zone: "Zona Oeste", minTempC: 19, maxTempC: 34 },
    { zone: "Zona Sul", minTempC: 21, maxTempC: 30 },
  ],
  days: [
    {
      label: "Sexta-feira",
      dateHint: "13/11",
      summary:
        "Céu parcialmente nublado a nublado. Pancadas de chuva isoladas. Ventos fraco a moderado.",
      rainHint: "Pancadas de chuva isoladas",
      windHint: "Fraco a Moderado de SW/W",
      minTempC: 18,
      maxTempC: 30,
      tempTrend: "estavel",
      iconUrl: null,
      skyHint: "Parcialmente Nublado a Nublado",
      corDetail: null,
    },
  ],
};
