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
import { cn } from "@/lib/utils";

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
  { Icon: LucideIcon; label: string; color: string; glow: string }
> = {
  sun: {
    Icon: Sun,
    label: "Sol",
    color: "text-amber-300",
    glow: "from-amber-400/25 to-amber-500/5",
  },
  partly: {
    Icon: CloudSun,
    label: "Sol e nuvens",
    color: "text-amber-200",
    glow: "from-amber-300/20 to-sky-400/10",
  },
  cloudy: {
    Icon: Cloudy,
    label: "Nublado",
    color: "text-slate-200",
    glow: "from-slate-400/20 to-slate-500/5",
  },
  drizzle: {
    Icon: CloudDrizzle,
    label: "Chuvisco",
    color: "text-sky-300",
    glow: "from-sky-400/25 to-slate-500/5",
  },
  rain: {
    Icon: CloudRain,
    label: "Chuva",
    color: "text-sky-300",
    glow: "from-sky-400/30 to-blue-500/10",
  },
  heavy: {
    Icon: CloudRain,
    label: "Chuva forte",
    color: "text-blue-300",
    glow: "from-blue-400/30 to-indigo-500/10",
  },
  storm: {
    Icon: CloudLightning,
    label: "Tempestade",
    color: "text-violet-300",
    glow: "from-violet-400/25 to-slate-500/10",
  },
  fog: {
    Icon: CloudFog,
    label: "Neblina",
    color: "text-slate-300",
    glow: "from-slate-400/20 to-slate-600/5",
  },
};

/** Infere ícone a partir do texto do boletim / céu / precip do Alerta Rio. */
export function weatherKindFromText(...parts: Array<string | null | undefined>): WeatherKind {
  const t = parts.filter(Boolean).join(" ").toLowerCase();
  if (!t.trim()) return "cloudy";

  if (/trovoad|tempestade|raio|rel[aâ]mpago|eletr/.test(t)) return "storm";
  if (/muito forte|moderada a forte|chuva forte|pancadas? fortes?/.test(t)) return "heavy";
  if (/chuvisco/.test(t) && !/moderada|forte/.test(t)) return "drizzle";
  if (/chuva fraca a moderada|chuva moderada|possibilidade de chuva|chuva isolada|pancadas/.test(t))
    return "rain";
  if (/chuva fraca|garoa|fraca isolada/.test(t)) return "drizzle";
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
  const { Icon, label, color, glow } = KIND_META[kind];
  return { Icon, label, className: color, glow };
}

/** Ícone compacto para cards de dia / hero — Lucide com halo suave. */
export function WeatherGlyph({
  kind,
  size = "md",
  className = "",
}: {
  kind: WeatherKind;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { Icon, label, color, glow } = KIND_META[kind];
  const box = size === "sm" ? "size-9" : size === "lg" ? "size-14" : "size-11";
  const px = size === "sm" ? 20 : size === "lg" ? 34 : 26;
  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-br",
        glow,
        box,
        className,
      )}
      aria-label={label}
      role="img"
    >
      <Icon size={px} strokeWidth={1.6} className={cn(color, "drop-shadow-sm")} aria-hidden />
    </span>
  );
}
