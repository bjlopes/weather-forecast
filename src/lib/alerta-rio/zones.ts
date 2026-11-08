import type { ZoneName } from "./types";

export const STATION_ZONES: Record<number, ZoneName> = {
  1: "Zona Sul", 2: "Zona Sul", 3: "Zona Sul", 4: "Baía de Guanabara",
  5: "Baía de Guanabara", 6: "Zona Sul", 7: "Baía de Guanabara",
  8: "Baía de Guanabara", 9: "Baía de Guanabara", 10: "Baía de Guanabara",
  11: "Baía de Guanabara", 12: "Baía de Guanabara", 13: "Baía de Guanabara",
  14: "Barra/Jacarepaguá", 15: "Baía de Guanabara", 16: "Zona Sul",
  17: "Barra/Jacarepaguá", 18: "Barra/Jacarepaguá", 19: "Barra/Jacarepaguá",
  20: "Baía de Sepetiba", 21: "Barra/Jacarepaguá", 22: "Baía de Sepetiba",
  23: "Baía de Guanabara", 24: "Baía de Guanabara", 25: "Barra/Jacarepaguá",
  26: "Baía de Sepetiba", 27: "Baía de Sepetiba", 28: "Baía de Guanabara",
  29: "Baía de Sepetiba", 30: "Barra/Jacarepaguá", 31: "Baía de Guanabara",
  32: "Baía de Guanabara", 33: "Baía de Guanabara",
};

export function zoneForStation(id: number): ZoneName {
  return STATION_ZONES[id] ?? "Baía de Guanabara";
}
