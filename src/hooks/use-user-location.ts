"use client";

import { useCallback, useState } from "react";

export type UserLocation = { lat: number; lon: number };

export type LocationStatus = "idle" | "loading" | "ready" | "error";

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("error");
      setError("Geolocalização não disponível neste dispositivo.");
      setLocation(null);
      return;
    }
    setStatus("loading");
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        };
        setLocation(next);
        setStatus("ready");
        setError(null);
      },
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? "Permissão de localização negada."
            : err.code === err.POSITION_UNAVAILABLE
              ? "Não foi possível obter a posição."
              : "Tempo esgotado ao obter a localização.";
        setStatus("error");
        setError(message);
        setLocation(null);
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60_000 },
    );
  }, []);

  return { location, status, error, requestLocation };
}
