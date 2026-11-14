import type { StationHealth } from "./types";

export function stationAgeHours(
  readAtIso: string | null | undefined,
  now = Date.now(),
): number | null {
  if (!readAtIso) return null;
  const t = Date.parse(readAtIso);
  if (Number.isNaN(t)) return null;
  return (now - t) / 3_600_000;
}

/** Estações sem leitura há 3+ dias ficam ocultas até voltarem a operar. */
export function isStationStaleDays(
  station: { readAtIso?: string | null },
  days = 3,
  now = Date.now(),
): boolean {
  const ageH = stationAgeHours(station.readAtIso, now);
  if (ageH == null) return false;
  return ageH >= days * 24;
}

export function classifyHealth(readAtIso: string | null | undefined, now = Date.now()): {
  health: StationHealth;
  healthLabel: string;
} {
  const ageH = stationAgeHours(readAtIso, now);
  if (ageH == null) {
    return { health: "desconhecida", healthLabel: "Sem leitura" };
  }
  if (ageH <= 2) return { health: "ativa", healthLabel: "Ativa" };
  if (ageH <= 24) return { health: "atrasada", healthLabel: `Atrasada · ${Math.round(ageH)} h` };
  if (ageH <= 24 * 7) {
    const days = Math.max(1, Math.round(ageH / 24));
    return { health: "parada", healthLabel: `Parada · ${days} d` };
  }
  if (ageH <= 24 * 60) {
    const days = Math.round(ageH / 24);
    return { health: "parada", healthLabel: `Parada · ${days} d` };
  }
  const months = Math.max(1, Math.round(ageH / (24 * 30)));
  return {
    health: "parada",
    healthLabel: months === 1 ? "Parada · 1 mês" : `Parada · ${months} meses`,
  };
}

export function networkLabel(network: string): string {
  switch (network) {
    case "alerta_rio":
      return "Alerta Rio";
    case "inmet":
      return "INMET";
    case "cemaden":
      return "CEMADEN";
    case "metar":
      return "Aeroporto";
    default:
      return network;
  }
}
