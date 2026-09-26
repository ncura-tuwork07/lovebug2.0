import "server-only";
import { lookup } from "node:dns/promises";

// Diagnóstico de velocidad para el panel de admin: la causa más común de una app lenta es que las
// funciones de Vercel corran en una región y la base de Supabase esté en otra (cada consulta cruza
// el continente ida y vuelta, y una pantalla hace varias). Medimos y decimos qué región elegir.

// Región de AWS (donde vive Supabase) → región de Vercel más cercana.
const AWS_TO_VERCEL: Record<string, { vercel: string; city: string }> = {
  "sa-east-1": { vercel: "gru1", city: "São Paulo" },
  "us-east-1": { vercel: "iad1", city: "Washington (EE.UU. este)" },
  "us-east-2": { vercel: "cle1", city: "Cleveland (EE.UU.)" },
  "us-west-1": { vercel: "sfo1", city: "San Francisco" },
  "us-west-2": { vercel: "pdx1", city: "Portland (EE.UU. oeste)" },
  "ca-central-1": { vercel: "yul1", city: "Montreal" },
  "eu-west-1": { vercel: "dub1", city: "Dublín" },
  "eu-west-2": { vercel: "lhr1", city: "Londres" },
  "eu-west-3": { vercel: "cdg1", city: "París" },
  "eu-central-1": { vercel: "fra1", city: "Frankfurt" },
  "eu-north-1": { vercel: "arn1", city: "Estocolmo" },
  "ap-south-1": { vercel: "bom1", city: "Bombay" },
  "ap-southeast-1": { vercel: "sin1", city: "Singapur" },
  "ap-southeast-2": { vercel: "syd1", city: "Sídney" },
  "ap-northeast-1": { vercel: "hnd1", city: "Tokio" },
  "ap-northeast-2": { vercel: "icn1", city: "Seúl" },
};
const VERCEL_CITY: Record<string, string> = Object.fromEntries(Object.values(AWS_TO_VERCEL).map((v) => [v.vercel, v.city]));

export type SpeedReport = {
  vercelRegion: string | null;
  vercelCity: string | null;
  supabaseHost: string | null;
  supabaseRegion: string | null; // región de AWS, si la pudimos deducir
  roundTripMs: number | null; // mediana de 3 idas y vueltas a Supabase desde el servidor
  recommended: string | null; // región de Vercel sugerida
  sameRegion: boolean | null;
  hints: string[]; // encabezados de Supabase que nombran una región, por si ayudan
};

let awsRanges: { prefix: string; region: string }[] | null = null;
async function awsRegionOf(ip: string): Promise<string | null> {
  try {
    if (!awsRanges) {
      const res = await fetch("https://ip-ranges.amazonaws.com/ip-ranges.json", { cache: "force-cache" });
      const json = (await res.json()) as { prefixes: { ip_prefix: string; region: string; service: string }[] };
      awsRanges = json.prefixes.filter((p) => p.service === "EC2" || p.service === "AMAZON").map((p) => ({ prefix: p.ip_prefix, region: p.region }));
    }
    const toInt = (a: string) => a.split(".").reduce((n, o) => n * 256 + Number(o), 0);
    const target = toInt(ip);
    for (const { prefix, region } of awsRanges) {
      const [base, bits] = prefix.split("/");
      const size = 2 ** (32 - Number(bits));
      const start = toInt(base);
      if (target >= start && target < start + size && region !== "GLOBAL") return region;
    }
  } catch {}
  return null;
}

export async function measureSpeed(): Promise<SpeedReport> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const vercelRegion = process.env.VERCEL_REGION ?? null;
  let host: string | null = null;
  try {
    host = new URL(url).hostname;
  } catch {}

  // Tres idas y vueltas livianas (la primera abre la conexión; nos quedamos con la mediana).
  const times: number[] = [];
  const hints = new Set<string>();
  for (let i = 0; i < 3 && host; i++) {
    const t0 = performance.now();
    try {
      // Cada pedido con su propia dirección: Next reutiliza los fetch idénticos dentro de un render.
      const res = await fetch(`${url}/auth/v1/health?medida=${i}-${Date.now()}`, { headers: { apikey: key }, cache: "no-store" });
      await res.text();
      times.push(performance.now() - t0);
      res.headers.forEach((value, name) => {
        if (/region|^sb-|^x-sb|cf-ray/i.test(name)) hints.add(`${name}: ${value}`);
      });
    } catch {}
  }
  times.sort((a, b) => a - b);
  const roundTripMs = times.length ? Math.round(times[Math.floor(times.length / 2)]) : null;

  let supabaseRegion: string | null = null;
  const regionHeader = [...hints].find((h) => /region/i.test(h));
  const fromHeader = regionHeader?.match(/([a-z]{2}-[a-z]+-\d)/)?.[1];
  if (fromHeader && AWS_TO_VERCEL[fromHeader]) supabaseRegion = fromHeader;
  if (!supabaseRegion && host) {
    try {
      const { address } = await lookup(host, { family: 4 });
      supabaseRegion = await awsRegionOf(address);
    } catch {}
  }

  const recommended = supabaseRegion ? (AWS_TO_VERCEL[supabaseRegion]?.vercel ?? null) : null;
  const sameRegion = recommended && vercelRegion ? recommended === vercelRegion : roundTripMs !== null ? roundTripMs < 20 : null;
  return {
    vercelRegion,
    vercelCity: vercelRegion ? (VERCEL_CITY[vercelRegion] ?? null) : null,
    supabaseHost: host,
    supabaseRegion,
    roundTripMs,
    recommended,
    sameRegion,
    hints: [...hints].slice(0, 6),
  };
}

export const regionCity = (vercel: string | null) => (vercel ? (VERCEL_CITY[vercel] ?? vercel) : null);
export const awsCity = (aws: string | null) => (aws ? (AWS_TO_VERCEL[aws]?.city ?? aws) : null);
