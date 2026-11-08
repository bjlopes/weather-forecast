"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatPlace, searchCities, type CityResult } from "@/lib/weather";

interface CitySearchProps {
  onSelect: (city: CityResult) => void;
  disabled?: boolean;
}

export function CitySearch({ onSelect, disabled }: CitySearchProps) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CityResult[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);
  const suppressSearchRef = useRef(false);

  useEffect(() => {
    const q = query.trim();
    if (suppressSearchRef.current) {
      suppressSearchRef.current = false;
      return;
    }
    if (q.length < 2) {
      setResults([]);
      setError(null);
      setOpen(false);
      return;
    }

    const handle = window.setTimeout(() => {
      startTransition(async () => {
        try {
          const cities = await searchCities(q);
          setResults(cities);
          setOpen(true);
          setError(cities.length === 0 ? "No cities found" : null);
        } catch {
          setResults([]);
          setError("Search failed. Try again.");
        }
      });
    }, 280);

    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <div ref={wrapRef} className="relative w-full max-w-xl">
      <label htmlFor="city-search" className="sr-only">
        Search for a city
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-[color:var(--ink-soft)]" />
        <Input
          id="city-search"
          value={query}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder="Search São Paulo, Lisbon, Tokyo…"
          className={cn(
            "h-14 rounded-2xl border-white/25 bg-white/15 pr-12 pl-12 text-base text-[color:var(--ink)] shadow-[0_18px_50px_-28px_rgba(12,48,58,0.55)] backdrop-blur-md placeholder:text-[color:var(--ink-soft)]",
            "focus-visible:border-white/55 focus-visible:ring-[color:var(--accent)]/35 md:text-base"
          )}
          onChange={(e) => {
            suppressSearchRef.current = false;
            setQuery(e.target.value);
          }}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
        />
        {isPending ? (
          <Loader2 className="absolute top-1/2 right-4 size-5 -translate-y-1/2 animate-spin text-[color:var(--ink-soft)]" />
        ) : null}
      </div>

      {open && (results.length > 0 || error) ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-white/20 bg-[color:var(--panel)]/95 p-1.5 shadow-[0_24px_60px_-30px_rgba(12,48,58,0.7)] backdrop-blur-xl"
        >
          {error ? (
            <li className="px-3 py-3 text-sm text-[color:var(--ink-soft)]">{error}</li>
          ) : (
            results.map((city) => (
              <li key={city.id} role="option">
                <button
                  type="button"
                  className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[color:var(--accent-soft)] focus-visible:bg-[color:var(--accent-soft)] focus-visible:outline-none"
                  onClick={() => {
                    suppressSearchRef.current = true;
                    onSelect(city);
                    setQuery(city.name);
                    setResults([]);
                    setOpen(false);
                  }}
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-[color:var(--accent-deep)]" />
                  <span>
                    <span className="block font-medium text-[color:var(--ink)]">
                      {city.name}
                    </span>
                    <span className="block text-sm text-[color:var(--ink-soft)]">
                      {formatPlace({
                        name: "",
                        admin1: city.admin1,
                        country: city.country,
                      }).replace(/^,\s*/, "")}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
