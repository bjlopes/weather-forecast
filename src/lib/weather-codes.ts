export type WeatherTone = "clear" | "cloud" | "rain" | "storm" | "snow" | "fog";

export interface WeatherMeta {
  label: string;
  tone: WeatherTone;
  icon: "sun" | "cloud-sun" | "cloud" | "fog" | "drizzle" | "rain" | "storm" | "snow";
}

const TABLE: Record<number, WeatherMeta> = {
  0: { label: "Clear sky", tone: "clear", icon: "sun" },
  1: { label: "Mainly clear", tone: "clear", icon: "cloud-sun" },
  2: { label: "Partly cloudy", tone: "cloud", icon: "cloud-sun" },
  3: { label: "Overcast", tone: "cloud", icon: "cloud" },
  45: { label: "Fog", tone: "fog", icon: "fog" },
  48: { label: "Rime fog", tone: "fog", icon: "fog" },
  51: { label: "Light drizzle", tone: "rain", icon: "drizzle" },
  53: { label: "Drizzle", tone: "rain", icon: "drizzle" },
  55: { label: "Heavy drizzle", tone: "rain", icon: "drizzle" },
  56: { label: "Freezing drizzle", tone: "rain", icon: "drizzle" },
  57: { label: "Heavy freezing drizzle", tone: "rain", icon: "drizzle" },
  61: { label: "Light rain", tone: "rain", icon: "rain" },
  63: { label: "Rain", tone: "rain", icon: "rain" },
  65: { label: "Heavy rain", tone: "rain", icon: "rain" },
  66: { label: "Freezing rain", tone: "rain", icon: "rain" },
  67: { label: "Heavy freezing rain", tone: "rain", icon: "rain" },
  71: { label: "Light snow", tone: "snow", icon: "snow" },
  73: { label: "Snow", tone: "snow", icon: "snow" },
  75: { label: "Heavy snow", tone: "snow", icon: "snow" },
  77: { label: "Snow grains", tone: "snow", icon: "snow" },
  80: { label: "Light showers", tone: "rain", icon: "rain" },
  81: { label: "Showers", tone: "rain", icon: "rain" },
  82: { label: "Heavy showers", tone: "rain", icon: "rain" },
  85: { label: "Snow showers", tone: "snow", icon: "snow" },
  86: { label: "Heavy snow showers", tone: "snow", icon: "snow" },
  95: { label: "Thunderstorm", tone: "storm", icon: "storm" },
  96: { label: "Thunderstorm with hail", tone: "storm", icon: "storm" },
  99: { label: "Severe thunderstorm", tone: "storm", icon: "storm" },
};

export function weatherMeta(code: number): WeatherMeta {
  return TABLE[code] ?? { label: "Unknown", tone: "cloud", icon: "cloud" };
}
