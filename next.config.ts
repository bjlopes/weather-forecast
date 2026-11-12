import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Keep config minimal for Cloud Agent compatibility */
  outputFileTracingIncludes: {
    "/api/previsao": ["./src/lib/alerta-rio/previsao-24h-latest.html"],
    "/api/previsao/estendida": ["./src/lib/alerta-rio/previsao-24h-latest.html"],
  },
};

export default nextConfig;
