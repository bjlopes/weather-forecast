export interface HourlyPoint {
  time: string;
  temperatureC: number;
  precipMm: number;
  precipProb: number | null;
  weatherCode: number;
}

export interface HourlyForecast {
  source: "live" | "sample";
  sourceUrl: string;
  latitude: number;
  longitude: number;
  hours: HourlyPoint[];
}

const RIO = { lat: -22.9068, lon: -43.1729 };

const SAMPLE_HOURS: HourlyPoint[] = Array.from({ length: 24 }, (_, i) => ({
  time: new Date(Date.UTC(2026, 10, 8, 12 + i)).toISOString(),
  temperatureC: 20 + Math.round(4 * Math.sin(i / 4)),
  precipMm: i % 5 === 0 ? 0.4 : 0,
  precipProb: 40 + (i % 6) * 5,
  weatherCode: i % 5 === 0 ? 61 : 3,
}));

export async function getHourlyForecast(): Promise<HourlyForecast> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${RIO.lat}&longitude=${RIO.lon}` +
    `&hourly=temperature_2m,precipitation_probability,precipitation,weather_code` +
    `&forecast_days=2&timezone=America%2FSao_Paulo`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    const json = (await res.json()) as {
      hourly: {
        time: string[];
        temperature_2m: number[];
        precipitation: number[];
        precipitation_probability: (number | null)[];
        weather_code: number[];
      };
    };
    const now = Date.now();
    const hours: HourlyPoint[] = json.hourly.time
      .map((time, i) => ({
        time,
        temperatureC: json.hourly.temperature_2m[i],
        precipMm: json.hourly.precipitation[i],
        precipProb: json.hourly.precipitation_probability[i],
        weatherCode: json.hourly.weather_code[i],
      }))
      .filter((h) => new Date(h.time).getTime() >= now - 60 * 60 * 1000)
      .slice(0, 24);

    if (!hours.length) throw new Error("Sem horas");
    return {
      source: "live",
      sourceUrl: "https://open-meteo.com/",
      latitude: RIO.lat,
      longitude: RIO.lon,
      hours,
    };
  } catch {
    return {
      source: "sample",
      sourceUrl: "https://open-meteo.com/",
      latitude: RIO.lat,
      longitude: RIO.lon,
      hours: SAMPLE_HOURS,
    };
  }
}
