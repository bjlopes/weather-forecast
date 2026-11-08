import type { LucideIcon } from "lucide-react";
import {
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Cloudy,
  Sun,
} from "lucide-react";

export type WeatherKind =
  | "sun"
  | "partly"
  | "cloudy"
  | "drizzle"
  | "rain"
  | "heavy"
  | "storm"
  | "fog";

const KIND_META: Record<
  WeatherKind,
  { Icon: LucideIcon; label: string; className: string }
> = {
  sun: { Icon: Sun, label: "Sol", className: "text-amber-400" },
  partly: { Icon: CloudSun, label: "Sol e nuvens", className: "text-amber-300" },
  cloudy: { Icon: Cloudy, label: "Nublado", className: "text-slate-300" },
  drizzle: { Icon: CloudDrizzle, label: "Chuvisco", className: "text-sky-400" },
  rain: { Icon: CloudRain, label: "Chuva", className: "text-sky-400" },
  heavy: { Icon: CloudRain, label: "Chuva forte", className: "text-blue-400" },
  storm: { Icon: CloudLightning, label: "Tempestade", className: "text-violet-400" },
  fog: { Icon: CloudFog, label: "Neblina", className: "text-slate-400" },
};

/** Infere ícone a partir do texto do boletim (resumo, título, dicas). */
export function weatherKindFromText(...parts: Array<string | null | undefined>): WeatherKind {
  const t = parts.filter(Boolean).join(" ").toLowerCase();
  if (!t.trim()) return "cloudy";

  if (/trovoad|tempestade|raio|relâmpago|eletr/.test(t)) return "storm";
  if (/muito forte|moderada a forte|chuva forte|pancadas? fortes?/.test(t)) return "heavy";
  if (/chuva fraca a moderada|chuva moderada|possibilidade de chuva|com.*chuva|chuva isolada|pancadas/.test(t))
    return "rain";
  if (/chuva fraca|chuvisco|garoa|fraca isolada/.test(t)) return "drizzle";
  if (/sem (previs[aã]o de )?chuva|sem chuva/.test(t)) {
    if (/parcialmente nublado|sol entre|poucas nuvens|variad/.test(t)) return "partly";
    if (/encoberto|nublado|nebulosidade/.test(t)) return "cloudy";
    return "sun";
  }
  if (/tempo bom|ensolarado|c[eé]u claro|c[eé]u aberto/.test(t)) return "sun";
  if (/neblina|nevoeiro|n[eé]voa/.test(t)) return "fog";
  if (/parcialmente nublado|variad|sol entre nuvens|poucas nuvens/.test(t)) return "partly";
  if (/encoberto|nublado|nebulosidade|nuvens/.test(t)) return "cloudy";
  if (/chuva/.test(t)) return "rain";

  return "cloudy";
}

export function weatherMeta(kind: WeatherKind) {
  return KIND_META[kind];
}

/** Ícone compacto para cards de dia / hero. */
export function WeatherGlyph({
  kind,
  size = "md",
  className = "",
}: {
  kind: WeatherKind;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { Icon, label, className: color } = KIND_META[kind];
  const px = size === "sm" ? 22 : size === "lg" ? 44 : 32;
  return (
    <Icon
      size={px}
      strokeWidth={1.75}
      className={`${color} ${className}`}
      aria-label={label}
      role="img"
    />
  );
}
