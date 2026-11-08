import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudDrizzle,
  CloudSnow,
  CloudSun,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeatherMeta } from "@/lib/weather-codes";

const ICONS: Record<WeatherMeta["icon"], LucideIcon> = {
  sun: Sun,
  "cloud-sun": CloudSun,
  cloud: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  storm: CloudLightning,
  snow: CloudSnow,
};

export function WeatherIcon({
  icon,
  className,
}: {
  icon: WeatherMeta["icon"];
  className?: string;
}) {
  const Icon = ICONS[icon];
  return <Icon className={cn("shrink-0", className)} aria-hidden />;
}
