"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/** Bounds used by Alerta Rio mapaRadar.js for Sumaré reflectivity overlays. */
const RADAR_BOUNDS = L.latLngBounds(
  L.latLng(-24.431567, -45.336972),
  L.latLng(-21.478793, -41.159092),
);

const RADAR_SITE: L.LatLngExpression = [-22.960849, -43.2646667];
const RADAR_RANGE_M = 138_900;
/** Zoom out máximo ≈ círculo do radar + folga. */
const VIEW_RANGE_M = RADAR_RANGE_M * 1.12;

function radarViewBounds(): L.LatLngBounds {
  return L.circle(RADAR_SITE, { radius: VIEW_RANGE_M }).getBounds();
}

function lockZoomOut(map: L.Map, fit: boolean) {
  const bounds = radarViewBounds();
  map.setMaxBounds(bounds);
  if (fit) {
    map.fitBounds(bounds, { animate: false, padding: [8, 8] });
  }
  const minZ = map.getBoundsZoom(bounds, false);
  map.setMinZoom(minZ);
  if (map.getZoom() < minZ) map.setZoom(minZ);
}

export function RadarMap({
  overlayUrl,
  className,
}: {
  overlayUrl: string | null;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const overlayRef = useRef<L.ImageOverlay | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      maxZoom: 12,
      maxBoundsViscosity: 1,
    });

    // Mesmo basemap do mapaRadar.js oficial do Alerta Rio
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 18,
    }).addTo(map);

    L.control
      .attribution({ prefix: false, position: "bottomleft" })
      .addAttribution("Radar Sumaré · Alerta Rio / COR")
      .addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.circle(RADAR_SITE, {
      radius: RADAR_RANGE_M,
      weight: 2,
      dashArray: "10 10",
      color: "#1d4ed8",
      fill: false,
      interactive: false,
    }).addTo(map);

    lockZoomOut(map, true);
    mapRef.current = map;

    const onResize = () => {
      map.invalidateSize();
      lockZoomOut(map, false);
    };
    window.setTimeout(onResize, 80);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!overlayUrl) {
      if (overlayRef.current) {
        overlayRef.current.remove();
        overlayRef.current = null;
      }
      return;
    }

    if (overlayRef.current) {
      overlayRef.current.setUrl(overlayUrl);
      return;
    }

    overlayRef.current = L.imageOverlay(overlayUrl, RADAR_BOUNDS, {
      opacity: 0.85,
      interactive: false,
    }).addTo(map);
  }, [overlayUrl]);

  return <div ref={containerRef} className={className} role="img" aria-label="Mapa do radar Sumaré" />;
}
