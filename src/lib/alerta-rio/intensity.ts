import type { RainIntensity } from "./types";

export function rainIntensity(mmPerHour: number | null | undefined): RainIntensity {
  if (mmPerHour == null || Number.isNaN(mmPerHour) || mmPerHour < 0.2) return "seca";
  if (mmPerHour <= 5) return "fraca";
  if (mmPerHour <= 25) return "moderada";
  if (mmPerHour <= 50) return "forte";
  return "muito_forte";
}

export function intensityLabel(intensity: RainIntensity): string {
  switch (intensity) {
    case "seca": return "Sem chuva";
    case "fraca": return "Chuva fraca";
    case "moderada": return "Chuva moderada";
    case "forte": return "Chuva forte";
    case "muito_forte": return "Chuva muito forte";
  }
}
