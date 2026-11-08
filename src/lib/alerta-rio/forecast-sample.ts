import type { ForecastBulletin } from "./forecast-types";

/** Snapshot from COR/Alerta Rio bulletin (08/11/2026). */
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
    "O céu estará parcialmente nublado a encoberto, com previsão de chuva fraca a moderada ao longo do dia. Até o período da manhã há previsão de rajadas de vento de intensidade moderada a forte, perdendo intensidade a partir da tarde. As temperaturas apresentarão acentuado declínio.",
  minTempC: 17,
  maxTempC: 27,
  days: [
    {
      label: "Segunda e terça",
      dateHint: "09–10/11",
      summary:
        "Tempo instável com nebulosidade variada e chuva fraca isolada a qualquer momento de segunda e na madrugada/manhã de terça.",
      rainHint: "Chuva fraca isolada",
      windHint: "Ventos fracos a moderados",
    },
    {
      label: "Quarta-feira",
      dateHint: "11/11",
      summary:
        "Nebulosidade variada, céu nublado a parcialmente nublado e sem previsão de chuva.",
      rainHint: "Sem chuva",
      windHint: "Ventos moderados à tarde/noite",
    },
    {
      label: "Quinta-feira",
      dateHint: "12/11",
      summary:
        "Áreas de instabilidade: céu parcialmente nublado a nublado e chuva fraca a moderada isolada a partir da tarde.",
      rainHint: "Chuva fraca a moderada isolada",
      windHint: "Ventos fracos a moderados",
    },
  ],
  hourly: {
    source: "sample",
    sourceUrl: "https://open-meteo.com/",
    latitude: -22.9068,
    longitude: -43.1729,
    hours: [],
  },
};
