import { weatherMeta, type WeatherTone } from "@/lib/weather-codes";

export interface CityResult {
  id: number;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface CurrentConditions {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  isDay: boolean;
  time: string;
  label: string;
  tone: WeatherTone;
  icon: ReturnType<typeof weatherMeta>["icon"];
}

export interface DayForecast {
  date: string;
  weatherCode: number;
  label: string;
  tone: WeatherTone;
  icon: ReturnType<typeof weatherMeta>["icon"];
  tempMax: number;
  tempMin: number;
  precipProbability: number;
}

export interface WeatherBundle {
  city: CityResult;
  current: CurrentConditions;
  daily: DayForecast[];
}

interface GeocodeResponse {
  results?: Array<{
    id: number;
    name: string;
    country?: string;
    admin1?: string;
    latitude: number;
    longitude: number;
    timezone?: string;
  }>;
}

interface ForecastResponse {
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
}

export async function searchCities(query: string): Promise<CityResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", q);
  url.searchParams.set("count", "6");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("City search failed");
  const data = (await res.json()) as GeocodeResponse;

  return (data.results ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    country: r.country ?? "",
    admin1: r.admin1,
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone ?? "UTC",
  }));
}

export async function fetchWeather(city: CityResult): Promise<WeatherBundle> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(city.latitude));
  url.searchParams.set("longitude", String(city.longitude));
  url.searchParams.set(
    "current",
    [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "weather_code",
      "wind_speed_10m",
    ].join(",")
  );
  url.searchParams.set(
    "daily",
    [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
    ].join(",")
  );
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "5");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Weather fetch failed");
  const data = (await res.json()) as ForecastResponse;

  const meta = weatherMeta(data.current.weather_code);

  return {
    city: { ...city, timezone: data.timezone || city.timezone },
    current: {
      temperature: data.current.temperature_2m,
      feelsLike: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m,
      weatherCode: data.current.weather_code,
      isDay: data.current.is_day === 1,
      time: data.current.time,
      label: meta.label,
      tone: meta.tone,
      icon: meta.icon,
    },
    daily: data.daily.time.map((date, i) => {
      const dayMeta = weatherMeta(data.daily.weather_code[i] ?? 0);
      return {
        date,
        weatherCode: data.daily.weather_code[i] ?? 0,
        label: dayMeta.label,
        tone: dayMeta.tone,
        icon: dayMeta.icon,
        tempMax: data.daily.temperature_2m_max[i] ?? 0,
        tempMin: data.daily.temperature_2m_min[i] ?? 0,
        precipProbability: data.daily.precipitation_probability_max[i] ?? 0,
      };
    }),
  };
}

export function formatPlace(city: Pick<CityResult, "name" | "admin1" | "country">) {
  return [city.name, city.admin1, city.country].filter(Boolean).join(", ");
}

export function formatDayLabel(isoDate: string, timezone: string) {
  const date = new Date(`${isoDate}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: timezone,
  }).format(date);
}
