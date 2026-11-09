/**
 * Coordenadas das estações CEMADEN no município do Rio.
 * Quando o nome coincide com Alerta Rio, reutiliza a coordenada oficial COR;
 * demais usam centroide do bairro (OpenStreetMap / referências locais).
 */
export const CEMADEN_COORDS: Record<
  number,
  { lat: number; lon: number; name: string }
> = {
  7594: { lat: -22.882, lon: -43.451, name: "Padre Miguel" },
  7600: { lat: -22.94556, lon: -43.36278, name: "Jacarepaguá" },
  7615: { lat: -22.762, lon: -43.109, name: "Ilha de Paquetá" },
  7595: { lat: -22.905, lon: -43.279, name: "Salgueiro" },
  7607: { lat: -22.90944, lon: -43.68444, name: "Defesa Civil Santa Cruz" },
  8680: { lat: -22.997, lon: -43.365, name: "Campo Golf-RJ" },
  3215: { lat: -22.986, lon: -43.282, name: "Est. Pedra Bonita" },
  8679: { lat: -22.932, lon: -43.171, name: "Clube Naval RJ" },
  3043: { lat: -22.9125, lon: -43.36472, name: "Tanque Jacarepagua" },
  7606: { lat: -22.809, lon: -43.31, name: "Vigário Geral" },
  7596: { lat: -22.928, lon: -43.253, name: "Andaraí" },
  7597: { lat: -22.88, lon: -43.25, name: "CIEP Samuel Wainer" },
  3045: { lat: -22.897, lon: -43.352, name: "Praça Seca" },
  3044: { lat: -22.84444, lon: -43.27528, name: "Penha" },
  7613: { lat: -22.872, lon: -43.268, name: "Higienópolis" },
  7602: { lat: -22.999, lon: -43.269, name: "São Conrado" },
  7612: { lat: -22.935, lon: -43.248, name: "Usina" },
  7605: { lat: -22.806, lon: -43.386, name: "Pavuna" },
  7603: { lat: -22.927, lon: -43.178, name: "Catete" },
  7592: { lat: -22.90944, lon: -43.68444, name: "Santa Cruz" },
  7601: { lat: -22.9, lon: -43.3, name: "CIEP Dr. João Ramos de Souza" },
  7611: { lat: -22.93194, lon: -43.22167, name: "Tijuca" },
  3042: { lat: -22.886, lon: -43.299, name: "Abolição" },
  3114: { lat: -22.91832, lon: -43.17392, name: "Glória" },
  7610: { lat: -22.96583, lon: -43.27833, name: "Alto da Boa Vista" },
  7599: { lat: -22.988, lon: -43.459, name: "Vargem Pequena" },
  7609: { lat: -22.854, lon: -43.314, name: "Vicente de Carvalho" },
  7614: { lat: -22.88, lon: -43.294, name: "Pilares" },
  7593: { lat: -22.877, lon: -43.437, name: "Realengo Batan" },
  7591: { lat: -22.94, lon: -43.61, name: "Jardim Maravilha" },
};
