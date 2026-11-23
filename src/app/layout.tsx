import type { Metadata, Viewport } from "next";
import { Outfit, Plus_Jakarta_Sans, Caveat } from "next/font/google";
import "./globals.css";
import { RefreshOnFocus } from "@/components/RefreshOnFocus";
import { SwRegister } from "@/components/SwRegister";

const outfit = Outfit({
  variable: "--font-outfit",
  weight: ["600", "700", "800"],
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lovebug",
  description: "La familia, siempre en foco. Organización familiar compartida: calendario, logística, finanzas, compras, menú y más.",
  manifest: "/manifest.json",
  applicationName: "Lovebug",
  // Es solo de Naza y Jaz: que los buscadores no la listen.
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    title: "Lovebug",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFF6F1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Aplica el tema guardado antes del primer render, para que no parpadee.
const themeScript = `try{if(localStorage.getItem("lovebug-theme")==="dark"){document.documentElement.dataset.theme="dark";var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content","#131A29");}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className={`${outfit.variable} ${jakarta.variable} ${caveat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-cream text-ink">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <RefreshOnFocus />
        <SwRegister />
        {children}
      </body>
    </html>
  );
}
