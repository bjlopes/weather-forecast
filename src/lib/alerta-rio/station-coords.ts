/** Coordenadas oficiais — https://websempre.rio.rj.gov.br/dados/info */

export interface StationCoord {
  id: number;
  lat: number;
  lon: number;
}

export const STATION_COORDS: readonly StationCoord[] = [
  { id: 1, lat: -22.9925, lon: -43.23306 },
  { id: 2, lat: -22.95583, lon: -43.16667 },
  { id: 3, lat: -22.98583, lon: -43.245 },
  { id: 4, lat: -22.93194, lon: -43.22167 },
  { id: 5, lat: -22.93167, lon: -43.19639 },
  { id: 6, lat: -22.98639, lon: -43.18944 },
  { id: 7, lat: -22.92222, lon: -43.2675 },
  { id: 8, lat: -22.81806, lon: -43.21028 },
  { id: 9, lat: -22.84444, lon: -43.27528 },
  { id: 10, lat: -22.87333, lon: -43.33889 },
  { id: 11, lat: -22.82694, lon: -43.33694 },
  { id: 12, lat: -22.88028, lon: -43.46583 },
  { id: 13, lat: -22.89182, lon: -43.31005 },
  { id: 14, lat: -22.9125, lon: -43.36472 },
  { id: 15, lat: -22.89606, lon: -43.18786 },
  { id: 16, lat: -22.97278, lon: -43.22389 },
  { id: 17, lat: -23.00849, lon: -43.29965 },
  { id: 18, lat: -22.94556, lon: -43.36278 },
  { id: 19, lat: -22.97721, lon: -43.39155 },
  { id: 20, lat: -23.05028, lon: -43.59472 },
  { id: 21, lat: -22.92556, lon: -43.31583 },
  { id: 22, lat: -22.90944, lon: -43.68444 },
  { id: 23, lat: -22.89056, lon: -43.27806 },
  { id: 24, lat: -22.82694, lon: -43.40333 },
  { id: 25, lat: -23.01444, lon: -43.52139 },
  { id: 26, lat: -22.90361, lon: -43.56194 },
  { id: 27, lat: -22.96889, lon: -43.71167 },
  { id: 28, lat: -22.96583, lon: -43.27833 },
  { id: 29, lat: -22.85694, lon: -43.54111 },
  { id: 30, lat: -23.01, lon: -43.44056 },
  { id: 31, lat: -22.94056, lon: -43.1875 },
  { id: 32, lat: -22.89667, lon: -43.22167 },
  { id: 33, lat: -22.93278, lon: -43.24333 },
] as const;

const COORDS_BY_ID = new Map(STATION_COORDS.map((c) => [c.id, c]));

export function getStationCoord(id: number): StationCoord | undefined {
  return COORDS_BY_ID.get(id);
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Distância em km (Haversine). */
export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistanceKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}
