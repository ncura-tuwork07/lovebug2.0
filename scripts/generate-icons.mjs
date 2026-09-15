// Genera los PNG del ícono de la app a partir del isotipo, con el bichito
// dentro de la zona segura (80%) para que sirva como ícono "maskable".
// Uso: npm run icons

import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const bug = `
  <path d="M32 58C20 50 6 41 6 28 6 18 13 12 21 12c5 0 9 2 11 6 2-4 6-6 11-6 8 0 15 6 15 16 0 13-14 22-26 30z" fill="#FF5A5F"/>
  <path d="M32 18c2-4 6-6 11-6 8 0 15 6 15 16 0 13-14 22-26 30z" fill="#F0454B"/>
  <rect x="30.4" y="16" width="3.2" height="40" rx="1.6" fill="#0F172A"/>
  <circle cx="32" cy="15" r="9" fill="#0F172A"/>
  <path d="M25 6l3 5M39 6l-3 5" stroke="#F8FAFC" stroke-width="2.6" stroke-linecap="round"/>
  <circle cx="25" cy="4.5" r="2.6" fill="#F8FAFC"/><circle cx="39" cy="4.5" r="2.6" fill="#F8FAFC"/>
  <circle cx="21" cy="28" r="4" fill="#0F172A"/><circle cx="43" cy="28" r="4" fill="#0F172A"/>
  <circle cx="26" cy="40" r="3.2" fill="#0F172A"/><circle cx="38" cy="40" r="3.2" fill="#0F172A"/>
`;

function svg(size, radiusRatio) {
  const r = Math.round(size * radiusRatio);
  return Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="${(r / size) * 64}" fill="#1E293B"/>
  <g transform="translate(32 32) scale(0.78) translate(-32 -31)">${bug}</g>
</svg>`);
}

await mkdir("public/icons", { recursive: true });

const targets = [
  { file: "public/icons/icon-192.png", size: 192, radius: 0 },
  { file: "public/icons/icon-512.png", size: 512, radius: 0 },
  { file: "public/icons/apple-touch-icon.png", size: 180, radius: 0 },
  { file: "public/icons/icon-rounded-512.png", size: 512, radius: 0.22 },
];

for (const t of targets) {
  await sharp(svg(t.size, t.radius)).png().toFile(t.file);
  console.log("ok", t.file);
}
