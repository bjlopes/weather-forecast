import { getAlertaRioSnapshot } from "@/lib/alerta-rio/fetch";
import { getStationCoord } from "@/lib/alerta-rio/station-coords";
import { fetchCemadenStations } from "./cemaden";
import { classifyHealth, networkLabel } from "./health";
import { fetchInmetStations } from "./inmet";
import { fetchMetarStations } from "./metar";
import type { StationsSnapshot, UnifiedStation } from "./types";

function parseAlertaReadAt(readAt: string): string | null {
  // Tempo Real often "11:50" — assume today America/Sao_Paulo ≈ UTC-3
  const m = readAt.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const now = new Date();
  const local = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    Number(m[1]),
    Number(m[2]),
    0,
  );
  // If clock is in the future vs now, assume yesterday
  if (local.getTime() - now.getTime() > 30 * 60_000) {
    local.setDate(local.getDate() - 1);
  }
  return local.toISOString();
}

export async function getUnifiedStationsSnapshot(): Promise<StationsSnapshot> {
  const [alerta, inmet, cemaden, metar] = await Promise.all([
    getAlertaRioSnapshot(),
    fetchInmetStations(),
    fetchCemadenStations(),
    fetchMetarStations(),
  ]);

  const alertaStations: UnifiedStation[] = alerta.rainStations.map((s) => {
    const coord = getStationCoord(s.id);
    const iso = parseAlertaReadAt(s.readAt);
    const health = classifyHealth(iso);
    const m15 = s.rainMm.m15;
    const h1 = s.rainMm.h1;
    const raining = (m15 ?? h1 ?? 0) >= 0.2;
    return {
      id: `alerta:${s.id}`,
      network: "alerta_rio",
      networkLabel: networkLabel("alerta_rio"),
      name: s.name,
      subtitle: s.zone,
      lat: coord?.lat ?? null,
      lon: coord?.lon ?? null,
      readAt: s.readAt,
      readAtIso: iso,
      health: health.health === "desconhecida" ? "ativa" : health.health,
      healthLabel:
        health.health === "desconhecida" ? "Ativa (Tempo Real)" : health.healthLabel,
      rainMmH1: h1,
      rainMmH24: s.rainMm.h24,
      rainMmM15: m15,
      temperatureC: alerta.meteoStations.find((m) => m.id === s.id)?.temperatureC ?? null,
      humidityPct: alerta.meteoStations.find((m) => m.id === s.id)?.humidityPct ?? null,
      windSpeedKmh: alerta.meteoStations.find((m) => m.id === s.id)?.windSpeedKmh ?? null,
      weatherText: raining ? "Chovendo (15 min / 1 h)" : "Sem chuva agora",
      raining,
      detail: null,
      alertaId: s.id,
    };
  });

  const stations = [...alertaStations, ...inmet, ...cemaden, ...metar].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR"),
  );

  return {
    fetchedAt: new Date().toISOString(),
    stations,
    counts: {
      total: stations.length,
      alerta_rio: alertaStations.length,
      inmet: inmet.length,
      cemaden: cemaden.length,
      metar: metar.length,
    },
  };
}
