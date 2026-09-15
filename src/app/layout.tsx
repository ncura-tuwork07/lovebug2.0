import type { Metadata, Viewport } from "next";
import { Outfit, Plus_Jakarta_Sans, Caveat } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { RefreshOnFocus } from "@/components/RefreshOnFocus";
import { SwRegister } from "@/components/SwRegister";
import { LocationSharer } from "@/components/LocationSharer";
import { getCurrentMember, getMembers } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

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
  description: "La familia, siempre en foco.",
  manifest: "/manifest.json",
  applicationName: "Lovebug",
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let me: { id: string; share_location: boolean } | null = null;
  if (isSupabaseConfigured()) {
    const members = await getMembers();
    me = await getCurrentMember(members);
  }

  return (
    <html lang="es" suppressHydrationWarning className={`${outfit.variable} ${jakarta.variable} ${caveat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-cream text-ink">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <RefreshOnFocus />
        <SwRegister />
        <LocationSharer memberId={me?.id ?? null} enabled={me?.share_location ?? false} />
        <div className="mx-auto w-full max-w-md flex-1">
          <Header />
          <main className="pb-28">{children}</main>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
