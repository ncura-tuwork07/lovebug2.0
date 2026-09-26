"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { isNativeApp } from "@/lib/native";

const APK = "/lovebug-android.apk";

// En Android, desde el navegador: la app instalable, que usa la huella con el cartel del propio
// celu (como el home banking). No aparece dentro de la app ni en iPhone, ni si todavía no hay APK.
export function AndroidAppCard() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!/Android/i.test(navigator.userAgent) || isNativeApp()) return;
    fetch(APK, { method: "HEAD" })
      .then((r) => setShow(r.ok))
      .catch(() => {});
  }, []);

  if (!show) return null;
  return (
    <section className="lb-card">
      <h2 className="text-h2 mb-1 flex items-center gap-2 font-display uppercase tracking-wide text-ink">
        <Smartphone size={16} /> App para Android
      </h2>
      <p className="mb-3 text-body text-ink-soft">
        Lovebug como app del celu: te pide la huella con el cartel del propio teléfono cada vez que la abrís, como Mercado Pago o el banco.
      </p>
      <ol className="mb-4 flex list-decimal flex-col gap-1 pl-5 text-sm text-ink-soft">
        <li>Tocá “Descargar la app”.</li>
        <li>Abrí el archivo. Si Android pregunta, permití instalar apps desde Chrome.</li>
        <li>Abrí Lovebug, entrá con tu contraseña y activá la huella.</li>
      </ol>
      <a href={APK} download="Lovebug.apk" className="lb-btn flex min-h-11 items-center justify-center gap-2">
        <Download size={16} /> Descargar la app
      </a>
    </section>
  );
}
