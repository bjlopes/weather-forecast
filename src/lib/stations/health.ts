import type { StationHealth } from "./types";

export function classifyHealth(readAtIso: string | null | undefined, now = Date.now()): {
  health: StationHealth;
  healthLabel: string;
} {
  if (!readAtIso) {
    return { health: "desconhecida", healthLabel: "Sem leitura" };
  }
  const t = Date.parse(readAtIso);
  if (Number.isNaN(t)) {
    return { health: "desconhecida", healthLabel: "Sem leitura" };
  }
  const ageH = (now - t) / 3_600_000;
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
