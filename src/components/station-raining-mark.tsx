import { CloudRain } from "lucide-react";
import { cn } from "@/lib/utils";

/** Ícone compacto: só aparece quando há indício de chuva agora. */
export function StationRainingMark({
  raining,
  className,
}: {
  raining: boolean | null | undefined;
  className?: string;
}) {
  if (raining !== true) return null;
  return (
    <span
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-sky-500/15 text-sky-300",
        className,
      )}
      title="Chovendo agora"
      aria-label="Chovendo agora"
    >
      <CloudRain className="size-3.5" aria-hidden />
    </span>
  );
}
