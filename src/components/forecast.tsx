import { WeatherIcon } from "@/components/weather-icon";
import { formatDayLabel, type WeatherBundle } from "@/lib/weather";

export function Forecast({ weather }: { weather: WeatherBundle }) {
  return (
    <section
      aria-labelledby="forecast-heading"
      className="animate-rise-delay mx-auto w-full max-w-5xl px-6 pb-16 sm:px-10"
    >
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2
            id="forecast-heading"
            className="font-display text-2xl font-semibold text-[color:var(--ink)] sm:text-3xl"
          >
            Next days
          </h2>
          <p className="mt-1 text-[color:var(--ink-soft)]">
            A short outlook powered by Open-Meteo.
          </p>
        </div>
      </div>

      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {weather.daily.map((day, index) => (
          <li
            key={day.date}
            className="rounded-2xl border border-white/20 bg-white/10 px-4 py-5 backdrop-blur-md transition-transform duration-300 hover:-translate-y-0.5"
          >
            <p className="text-sm font-medium text-[color:var(--ink)]">
              {index === 0
                ? "Today"
                : formatDayLabel(day.date, weather.city.timezone)}
            </p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <WeatherIcon
                icon={day.icon}
                className="size-8 text-[color:var(--accent-deep)]"
              />
              <div className="text-right">
                <p className="font-display text-xl font-semibold text-[color:var(--ink)]">
                  {Math.round(day.tempMax)}°
                </p>
                <p className="text-sm text-[color:var(--ink-soft)]">
                  {Math.round(day.tempMin)}°
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-[color:var(--ink-soft)]">{day.label}</p>
            <p className="mt-1 text-xs tracking-wide text-[color:var(--ink-soft)] uppercase">
              Rain {Math.round(day.precipProbability)}%
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
