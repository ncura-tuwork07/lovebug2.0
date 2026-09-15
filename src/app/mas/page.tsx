import Link from "next/link";
import {
  BellRing,
  CalendarHeart,
  ChefHat,
  ListChecks,
  MapPin,
  Package,
  PartyPopper,
  ShoppingCart,
  Star,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { PushSetup } from "@/components/PushSetup";

const modules = [
  { href: "/compras", label: "Compras", desc: "Lista compartida, tachado al instante", icon: ShoppingCart, color: "#FF9F43" },
  { href: "/menu", label: "Menú semanal", desc: "Qué comemos, con recetas y compras", icon: ChefHat, color: "#0EA5A5" },
  { href: "/eventos", label: "Eventos", desc: "Cumples y reuniones con menú y compras", icon: PartyPopper, color: "#FF5A5F" },
  { href: "/recetas", label: "Recetas", desc: "Ingredientes y porciones", icon: UtensilsCrossed, color: "#14B8A6" },
  { href: "/despensa", label: "Despensa", desc: "Lo que ya hay en casa", icon: Package, color: "#8B5CF6" },
  { href: "/mapa", label: "Mapa", desc: "Dónde está cada uno", icon: MapPin, color: "#3B82F6" },
  { href: "/vencimientos", label: "Vencimientos y fechas", desc: "Seguros, servicios, cumples", icon: BellRing, color: "#F59E0B" },
  { href: "/proyectos", label: "Metas y proyectos", desc: "Hoy, semana, mes, 3 meses", icon: ListChecks, color: "#EC4899" },
  { href: "/puntos", label: "Puntos y premios", desc: "Tareas de los chicos con recompensas", icon: Star, color: "#10B981" },
  { href: "/familia", label: "Familia", desc: "Perfiles, fotos y documentos", icon: Users, color: "#8B5CF6" },
  { href: "/calendario", label: "Calendario", desc: "Todo lo que viene", icon: CalendarHeart, color: "#6366F1" },
];

export default function MasPage() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <header>
        <p className="text-sm text-coral">Todo lo demás</p>
        <h1 className="text-h1 font-display font-bold text-ink">Más</h1>
      </header>

      <ul className="grid grid-cols-2 gap-3">
        {modules.map(({ href, label, desc, icon: Icon, color }) => (
          <li key={href}>
            <Link href={href} className="lb-card flex h-full flex-col gap-2 !p-4">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: color }}
              >
                <Icon size={20} />
              </span>
              <span className="font-display text-item font-semibold text-ink">{label}</span>
              <span className="text-meta text-ink-faint">{desc}</span>
            </Link>
          </li>
        ))}
      </ul>

      <PushSetup />
    </div>
  );
}
