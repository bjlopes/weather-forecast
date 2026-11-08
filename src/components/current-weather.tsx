import type { ReactNode } from "react";
import { Droplets, Thermometer, Wind } from "lucide-react";
import { WeatherIcon } from "@/components/weather-icon";
import { formatPlace, type WeatherBundle } from "@/lib/weather";

export function CurrentWeather({ weather }: { weather: WeatherBundle }) {
  const { city, current } = weather;
  const updated = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: city.timezone,
  }).format(new Date(current.time));

  return (
    <section
      aria-labelledby="current-heading"
      className="animate-rise mx-auto w-full max-w-5xl px-6 pb-4 sm:px-10"
    >
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          <p className="text-sm tracking-[0.18em] text-[color:var(--ink-soft)] uppercase">
            Now in
          </p>
          <h2
            id="current-heading"
            className="font-display max-w-xl text-4xl leading-[1.05] font-semibold text-[color:var(--ink)] sm:text-5xl"
          >
            {formatPlace(city)}
          </h2>
          <p className="flex items-center gap-2 text-lg text-[color:var(--ink-soft)]">
            <WeatherIcon icon={current.icon} className="size-6" />
            {current.label}
            <span aria-hidden>·</span>
            Updated {updated}
          </p>
        </div>

        <div className="flex items-start gap-2">
          <span className="font-display text-7xl leading-none font-semibold tracking-tight text-[color:var(--ink)] sm:text-8xl">
            {Math.round(current.temperature)}
          </span>
          <span className="mt-3 text-2xl text-[color:var(--ink-soft)]">°C</span>
        </div>
      </div>

      <dl className="mt-10 grid gap-4 sm:grid-cols-3">
        <Stat
          icon={<Thermometer className="size-4" />}
          label="Feels like"
          value={`${Math.round(current.feelsLike)}°`}
        />
        <Stat
          icon={<Droplets className="size-4" />}
          label="Humidity"
          value={`${Math.round(current.humidity)}%`}
        />
        <Stat
          icon={<Wind className="size-4" />}
          label="Wind"
          value={`${Math.round(current.windSpeed)} km/h`}
        />
      </dl>
    </section>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur-md">
      <dt className="flex items-center gap-2 text-sm text-[color:var(--ink-soft)]">
        {icon}
        {label}
      </dt>
      <dd className="mt-2 font-display text-2xl font-semibold text-[color:var(--ink)]">
        {value}
      </dd>
    </div>
  );
}
