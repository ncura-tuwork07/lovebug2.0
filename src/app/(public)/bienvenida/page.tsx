import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, Bot, HeartHandshake, Lock, Smartphone, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MODULES } from "@/lib/modules";

export const metadata: Metadata = {
  title: "Lovebug · La familia, siempre en foco",
  description:
    "Organización familiar compartida y gratis: calendario, logística, finanzas, compras, menú semanal, recetas, eventos, puntos para los chicos y más. Para parejas y familias.",
};

const STEPS = [
  { n: "1", title: "Creá tu hogar", text: "Con tu email y una contraseña. Sin tarjeta, sin publicidad." },
  { n: "2", title: "Invitá a los tuyos", text: "Compartís un link y ya están todos viendo lo mismo, al instante: pareja, familia, amigos, compañeros de casa." },
  { n: "3", title: "Instalala como app", text: "Desde el navegador, “Agregar a pantalla de inicio”. Recibís avisos de vencimientos y traslados." },
];

const HIGHLIGHTS = [
  { icon: Sparkles, title: "Un “Hoy” que te ordena el día", text: "Tareas, traslados, eventos, lo que vence y hasta el Evangelio y el horóscopo del día." },
  { icon: HeartHandshake, title: "Pensada para compartir", text: "Ingresos y gastos por persona, saldo de cada uno, metas de ahorro en común. Cada quien con su rol." },
  { icon: BellRing, title: "Avisos que llegan solos", text: "Una hora antes de un traslado, cuando vence un pago, cuando se acerca un cumple." },
  { icon: Lock, title: "Privada de verdad", text: "Cada hogar ve solo lo suyo. Documentos en un lugar seguro, sin trackers." },
];

export default function LandingPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <header className="flex items-center justify-between pt-5">
        <span className="flex items-center gap-1.5 font-display text-lg font-bold">
          <Logo size={24} />
          <span>
            <span className="text-ink">Love</span>
            <span className="text-coral">bug</span>
          </span>
        </span>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link href="/login" className="min-h-11 rounded-full px-4 py-2.5 text-sm font-semibold text-ink-soft">
            Entrar
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-10 text-center">
        <Logo size={88} className="mx-auto drop-shadow-[0_10px_20px_rgb(255_90_95/0.30)]" />
        <h1 className="mt-5 font-display text-[34px] font-extrabold leading-[1.05] text-ink">
          La familia,
          <br />
          <span className="text-coral">siempre en foco.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xs text-body text-ink-soft">
          Calendario, logística, finanzas, compras, menú semanal y todo lo que hace andar la casa, en una sola app
          compartida con quien vivas o te organices.
        </p>
        <div className="mt-7 flex flex-col gap-3">
          <Link href="/registro" className="lb-btn text-center">
            Crear mi hogar gratis
          </Link>
          <Link href="/login" className="min-h-11 rounded-md px-6 py-3 text-center text-[15px] font-semibold text-ink-soft">
            Ya tengo cuenta
          </Link>
        </div>
        <p className="mt-4 font-accent text-2xl text-amber">Gratis, sin publicidad, hecha con amor 🐞</p>
      </section>

      {/* Highlights */}
      <section className="mt-12 flex flex-col gap-3">
        {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="lb-card flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral-soft text-coral">
              <Icon size={20} />
            </span>
            <div>
              <h2 className="font-display text-item font-semibold text-ink">{title}</h2>
              <p className="mt-0.5 text-body text-ink-soft">{text}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Módulos */}
      <section className="mt-12">
        <p className="text-sm font-semibold text-coral">Todo en un lugar</p>
        <h2 className="text-h1 font-display font-bold text-ink">Los módulos</h2>
        <p className="mt-1 text-body text-ink-soft">Cada hogar activa los que usa y apaga los que no.</p>
        <ul className="mt-4 grid grid-cols-2 gap-3">
          {MODULES.map(({ key, label, desc, icon: Icon, color }) => (
            <li key={key} className="lb-card flex flex-col gap-2 !p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-full text-white" style={{ backgroundColor: color }}>
                <Icon size={18} />
              </span>
              <span className="font-display text-item font-semibold text-ink">{label}</span>
              <span className="text-meta text-ink-faint">{desc}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Cómo empezar */}
      <section className="mt-12">
        <p className="text-sm font-semibold text-coral">En dos minutos</p>
        <h2 className="text-h1 font-display font-bold text-ink">Cómo empezar</h2>
        <ol className="mt-4 flex flex-col gap-3">
          {STEPS.map((s) => (
            <li key={s.n} className="lb-card flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-soft font-display text-lg font-bold text-amber">
                {s.n}
              </span>
              <div>
                <h3 className="font-display text-item font-semibold text-ink">{s.title}</h3>
                <p className="mt-0.5 text-body text-ink-soft">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Para quién */}
      <section className="mt-12 lb-card !bg-amber-soft">
        <h2 className="text-h2 mb-2 flex items-center gap-2 font-display uppercase tracking-wide text-amber">
          <Smartphone size={16} /> Para quién es
        </h2>
        <p className="text-body text-ink">
          Para parejas, familias con chicos, abuelos, grupos de amigos o compañeros de casa: cualquier grupo que
          necesite coordinarse. Cada hogar elige su nombre y cada persona su rol. Funciona en Android y iPhone como app
          instalada, y en cualquier computadora desde el navegador.
        </p>
        <p className="mt-3 flex items-center gap-2 text-meta text-ink-faint">
          <Bot size={14} /> Sin inteligencia artificial obligatoria ni suscripciones: lo que ves es lo que hay.
        </p>
      </section>

      <section className="mt-12 text-center">
        <Link href="/registro" className="lb-btn inline-block">
          Crear mi hogar gratis
        </Link>
        <p className="mt-6 text-meta text-ink-faint">
          Hecha por Naza y Jaz para su familia, y compartida con la de ustedes. 🐞
        </p>
      </section>
    </div>
  );
}
