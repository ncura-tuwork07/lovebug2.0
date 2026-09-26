import type { NextConfig } from "next";

// Encabezados de seguridad básicos. Permissions-Policy deja solo lo que la app usa: ubicación
// (Mapa), micrófono (dictado), cámara (fotos) y la huella/cara (passkeys), y solo desde Lovebug.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "geolocation=(self), microphone=(self), camera=(self), publickey-credentials-get=(self), publickey-credentials-create=(self), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  experimental: {
    // Las pantallas ya visitadas se reutilizan del cache del router por 30 s: ir y volver
    // entre módulos es instantáneo. Cada cambio hace router.refresh(), así que no se ve viejo.
    staleTimes: { dynamic: 30, static: 180 },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
