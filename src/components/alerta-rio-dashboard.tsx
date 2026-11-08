"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CloudRain, Droplets, RefreshCw, Search, Thermometer, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { intensityLabel, rainIntensity } from "@/lib/alerta-rio/intensity";
import type { AlertaRioSnapshot, RainIntensity, RainStation, ZoneName } from "@/lib/alerta-rio/types";
import { cn } from "@/lib/utils";

const ZONES: Array<ZoneName | "Todas"> = ["Todas", "Zona Sul", "Baía de Guanabara", "Barra/Jacarepaguá", "Baía de Sepetiba"];

const INTENSITY_CLASS: Record<RainIntensity, string> = {
  seca: "bg-[oklch(0.92_0.02_220)] text-[oklch(0.35_0.04_220)]",
  fraca: "bg-[oklch(0.88_0.06_210)] text-[oklch(0.32_0.07_210)]",
  moderada: "bg-[oklch(0.88_0.1_85)] text-[oklch(0.35_0.1_70)]",
  forte: "bg-[oklch(0.84_0.14_55)] text-[oklch(0.32_0.12_45)]",
  muito_forte: "bg-[oklch(0.78_0.16_25)] text-[oklch(0.28_0.1_25)]",
};

function formatMm(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function formatMaybe(value: number | null | undefined, suffix = ""): string {
  if (value == null) return "—";
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}${suffix}`;
}

export function AlertaRioDashboard() {
  const [data, setData] = useState<AlertaRioSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [zone, setZone] = useState<ZoneName | "Todas">("Todas");
  const [selectedId, setSelectedId] = useState<number | null>(16);
  const [pending, startTransition] = useTransition();

  const load = () => {
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch("/api/alerta-rio", { cache: "no-store" });
        if (!res.ok) throw new Error("Não foi possível carregar os dados do Alerta Rio.");
        const json = (await res.json()) as AlertaRioSnapshot;
        setData(json);
        setSelectedId((current) => {
          if (current && json.rainStations.some((s) => s.id === current)) return current;
          return json.rainStations[0]?.id ?? null;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro inesperado");
      }
    });
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!data) return [] as RainStation[];
    const q = query.trim().toLowerCase();
    return data.rainStations
      .filter((s) => (zone === "Todas" ? true : s.zone === zone))
      .filter((s) => (!q ? true : s.name.toLowerCase().includes(q) || String(s.id).includes(q)))
      .sort((a, b) => (b.rainMm.h24 ?? 0) - (a.rainMm.h24 ?? 0));
  }, [data, query, zone]);

  const selected = data?.rainStations.find((s) => s.id === selectedId) ?? null;
  const meteo = data?.meteoStations.find((s) => s.id === selectedId) ?? null;
  const selectedIntensity = rainIntensity(selected ? (selected.rainMm.h1 ?? selected.rainMm.m15) : null);

  return (
    <div className="relative min-h-full overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_10%_-10%,oklch(0.78_0.08_210)_0%,transparent_55%),radial-gradient(90%_70%_at_90%_0%,oklch(0.86_0.07_85)_0%,transparent_50%),linear-gradient(180deg,oklch(0.97_0.015_220),oklch(0.93_0.02_200)_45%,oklch(0.9_0.03_85))]" />
      <div aria-hidden className="rain-veil pointer-events-none absolute inset-0 -z-10 opacity-40" />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 pb-2 pt-6 sm:px-8 sm:pt-8">
        <div className="animate-rise">
          <p className="font-display text-3xl tracking-tight text-[oklch(0.28_0.05_230)] sm:text-4xl">Alerta Rio</p>
          <p className="mt-1 text-sm text-[oklch(0.42_0.03_230)]">Tempo e chuva nas estações do COR</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={pending} className="border-[oklch(0.75_0.04_220)] bg-white/50 backdrop-blur">
          <RefreshCw className={cn("size-4", pending && "animate-spin")} />
          Atualizar
        </Button>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-4 sm:px-8">
        <section className="animate-rise-delay grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <h1 className="font-display max-w-xl text-4xl leading-[1.05] tracking-tight text-[oklch(0.22_0.05_230)] sm:text-5xl">Acompanhe a chuva bairro a bairro no Rio.</h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-[oklch(0.4_0.03_230)] sm:text-lg">Leituras pluviométricas e meteorológicas do Sistema Alerta Rio — Centro de Operações Rio.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#estacoes" className="inline-flex h-11 items-center justify-center rounded-md bg-[oklch(0.32_0.07_230)] px-5 text-sm font-medium text-white transition hover:bg-[oklch(0.28_0.07_230)]">Ver estações</a>
              <a href="https://alertario.rio.rj.gov.br/" target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center rounded-md border border-[oklch(0.75_0.04_220)] bg-white/55 px-5 text-sm font-medium text-[oklch(0.3_0.05_230)] backdrop-blur transition hover:bg-white/80">Site oficial</a>
            </div>
          </div>
          <div className="animate-float rounded-2xl border border-white/60 bg-white/45 p-5 shadow-[0_20px_60px_-40px_oklch(0.35_0.06_230)] backdrop-blur-md">
            {data?.zones?.length ? (
              <ul className="space-y-3">
                {data.zones.map((z) => (
                  <li key={z.zone} className="flex items-center justify-between gap-3 border-b border-[oklch(0.85_0.02_220)] pb-3 last:border-0 last:pb-0">
                    <span className="text-sm font-medium text-[oklch(0.3_0.04_230)]">{z.zone}</span>
                    <span className="text-right text-xs text-[oklch(0.45_0.03_230)]">{z.rainStage} · risco {z.landslideRisk.toLowerCase()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[oklch(0.45_0.03_230)]">Situação por zona aparece quando o Alerta Rio publica os estágios de chuva.</p>
            )}
            {data && (
              <p className="mt-4 text-xs text-[oklch(0.5_0.02_230)]">
                {data.source === "live" ? "Dados ao vivo do Alerta Rio" : "Amostra do Alerta Rio (servidor municipal indisponível neste ambiente)"}
              </p>
            )}
          </div>
        </section>

        <section id="estacoes" className="mt-14 scroll-mt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-2xl text-[oklch(0.25_0.05_230)]">Estações</h2>
              <p className="mt-1 text-sm text-[oklch(0.45_0.03_230)]">Filtre por zona ou busque pelo nome do bairro.</p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[oklch(0.55_0.02_230)]" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar estação…" className="h-11 border-[oklch(0.8_0.03_220)] bg-white/70 pl-9 backdrop-blur" aria-label="Buscar estação" />
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {ZONES.map((z) => (
              <button key={z} type="button" onClick={() => setZone(z)} className={cn("shrink-0 rounded-md px-3 py-1.5 text-sm transition", zone === z ? "bg-[oklch(0.32_0.07_230)] text-white" : "bg-white/55 text-[oklch(0.35_0.04_230)] hover:bg-white/80")}>{z}</button>
            ))}
          </div>

          {error && <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
          {!data && !error && <p className="mt-8 text-sm text-[oklch(0.45_0.03_230)]">Carregando estações do Alerta Rio…</p>}

          {data && (
            <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <ul className="max-h-[34rem] space-y-2 overflow-y-auto pr-1">
                {filtered.length === 0 && <li className="rounded-md bg-white/60 px-4 py-6 text-sm text-[oklch(0.45_0.03_230)]">Nenhuma estação encontrada para esse filtro.</li>}
                {filtered.map((station) => {
                  const intensity = rainIntensity(station.rainMm.h1 ?? station.rainMm.m15);
                  const active = station.id === selectedId;
                  return (
                    <li key={station.id}>
                      <button type="button" onClick={() => setSelectedId(station.id)} className={cn("flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition", active ? "border-[oklch(0.55_0.08_230)] bg-white shadow-sm" : "border-transparent bg-white/50 hover:bg-white/80")}>
                        <div>
                          <p className="font-medium text-[oklch(0.28_0.04_230)]">{station.name}</p>
                          <p className="text-xs text-[oklch(0.5_0.02_230)]">{station.zone} · {station.readAt}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular-nums text-[oklch(0.3_0.05_230)]">{formatMm(station.rainMm.h24)} mm</p>
                          <span className={cn("mt-1 inline-flex rounded px-2 py-0.5 text-[11px] font-medium", INTENSITY_CLASS[intensity])}>{intensityLabel(intensity)}</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <article className="rounded-2xl border border-white/70 bg-white/65 p-5 backdrop-blur-md sm:p-7">
                {selected ? (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs tracking-wide text-[oklch(0.5_0.03_230)] uppercase">Estação {selected.id}</p>
                        <h3 className="font-display mt-1 text-3xl text-[oklch(0.24_0.05_230)]">{selected.name}</h3>
                        <p className="mt-1 text-sm text-[oklch(0.45_0.03_230)]">{selected.zone} · leitura {selected.readAt}</p>
                      </div>
                      <span className={cn("rounded-md px-3 py-1 text-sm font-medium", INTENSITY_CLASS[selectedIntensity])}>{intensityLabel(selectedIntensity)}</span>
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        { label: "15 min", value: selected.rainMm.m15 },
                        { label: "1 h", value: selected.rainMm.h1 },
                        { label: "4 h", value: selected.rainMm.h4 },
                        { label: "24 h", value: selected.rainMm.h24 },
                        { label: "96 h", value: selected.rainMm.h96 },
                        { label: "No mês", value: selected.rainMm.month },
                      ].map((item) => (
                        <div key={item.label} className="rounded-xl bg-[oklch(0.96_0.015_220)] px-3 py-3">
                          <p className="flex items-center gap-1.5 text-xs text-[oklch(0.5_0.03_230)]"><Droplets className="size-3.5" />{item.label}</p>
                          <p className="mt-1 text-lg font-semibold tabular-nums text-[oklch(0.28_0.05_230)]">{formatMm(item.value)}<span className="ml-1 text-xs font-normal">mm</span></p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 border-t border-[oklch(0.88_0.02_220)] pt-5">
                      <p className="flex items-center gap-2 text-sm font-medium text-[oklch(0.32_0.04_230)]"><CloudRain className="size-4" />Meteorologia</p>
                      {meteo ? (
                        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                          <div className="rounded-xl bg-[oklch(0.96_0.02_85)] px-3 py-3">
                            <p className="flex items-center gap-1.5 text-xs text-[oklch(0.5_0.04_70)]"><Thermometer className="size-3.5" />Temperatura</p>
                            <p className="mt-1 text-lg font-semibold">{formatMaybe(meteo.temperatureC, " °C")}</p>
                          </div>
                          <div className="rounded-xl bg-[oklch(0.96_0.02_210)] px-3 py-3">
                            <p className="text-xs text-[oklch(0.5_0.03_210)]">Umidade</p>
                            <p className="mt-1 text-lg font-semibold">{formatMaybe(meteo.humidityPct, "%")}</p>
                          </div>
                          <div className="rounded-xl bg-[oklch(0.96_0.015_220)] px-3 py-3">
                            <p className="flex items-center gap-1.5 text-xs text-[oklch(0.5_0.03_230)]"><Wind className="size-3.5" />Vento</p>
                            <p className="mt-1 text-lg font-semibold">{formatMaybe(meteo.windSpeedKmh, " km/h")}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-[oklch(0.5_0.02_230)]">Esta estação não publica sensores meteorológicos no Tempo Real.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[oklch(0.45_0.03_230)]">Selecione uma estação para ver os detalhes.</p>
                )}
              </article>
            </div>
          )}
        </section>

        <footer className="mt-16 border-t border-[oklch(0.85_0.02_220)] pt-6 text-xs text-[oklch(0.5_0.02_230)]">
          Fonte: Sistema Alerta Rio / Centro de Operações Rio. Este app não substitui avisos oficiais de emergência.
        </footer>
      </main>
    </div>
  );
}
