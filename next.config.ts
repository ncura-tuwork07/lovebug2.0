import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Las pantallas ya visitadas se reutilizan del cache del router por 30 s: ir y volver
    // entre módulos es instantáneo. Cada cambio hace router.refresh(), así que no se ve viejo.
    staleTimes: { dynamic: 30, static: 180 },
  },
};

export default nextConfig;
