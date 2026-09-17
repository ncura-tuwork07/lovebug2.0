import {
  BellRing,
  CalendarHeart,
  CarFront,
  ChefHat,
  ListChecks,
  MapPin,
  Package,
  PartyPopper,
  PiggyBank,
  ShoppingCart,
  Star,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { HouseholdSettings } from "@/lib/types";

// Registro único de módulos: alimenta la grilla de "Más", los accesos rápidos de Hoy,
// la barra inferior y los interruptores de Ajustes.
export type ModuleDef = {
  key: string;
  href: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  color: string;
  core?: boolean; // no se puede apagar
};

export const MODULES: ModuleDef[] = [
  { key: "calendario", href: "/calendario", label: "Calendario", desc: "Todo lo que viene", icon: CalendarHeart, color: "#6366F1", core: true },
  { key: "finanzas", href: "/finanzas", label: "Finanzas", desc: "Ingresos, gastos, ahorro y topes", icon: PiggyBank, color: "#EC4899", core: true },
  { key: "familia", href: "/familia", label: "Familia", desc: "Perfiles, fotos y documentos", icon: Users, color: "#8B5CF6", core: true },
  { key: "logistica", href: "/logistica", label: "Logística", desc: "Quién lleva a quién y a qué hora", icon: CarFront, color: "#10B981" },
  { key: "compras", href: "/compras", label: "Compras", desc: "Lista compartida, tachado al instante", icon: ShoppingCart, color: "#FF9F43" },
  { key: "menu", href: "/menu", label: "Menú semanal", desc: "Qué comemos, con recetas y compras", icon: ChefHat, color: "#0EA5A5" },
  { key: "recetas", href: "/recetas", label: "Recetas", desc: "Ingredientes y porciones", icon: UtensilsCrossed, color: "#14B8A6" },
  { key: "despensa", href: "/despensa", label: "Despensa", desc: "Lo que ya hay en casa", icon: Package, color: "#8B5CF6" },
  { key: "eventos", href: "/eventos", label: "Eventos", desc: "Cumples y reuniones con menú y compras", icon: PartyPopper, color: "#FF5A5F" },
  { key: "vencimientos", href: "/vencimientos", label: "Vencimientos y fechas", desc: "Seguros, servicios, cumples", icon: BellRing, color: "#F59E0B" },
  { key: "proyectos", href: "/proyectos", label: "Metas y proyectos", desc: "Hoy, semana, mes, 3 meses", icon: ListChecks, color: "#EC4899" },
  { key: "puntos", href: "/puntos", label: "Puntos y premios", desc: "Tareas de los chicos con recompensas", icon: Star, color: "#10B981" },
  { key: "mapa", href: "/mapa", label: "Mapa", desc: "Dónde está cada uno", icon: MapPin, color: "#3B82F6" },
];

export function isModuleEnabled(settings: HouseholdSettings | null | undefined, key: string): boolean {
  const def = MODULES.find((m) => m.key === key);
  if (def?.core) return true;
  return settings?.modules?.[key] !== false;
}

export function enabledModules(settings: HouseholdSettings | null | undefined): ModuleDef[] {
  return MODULES.filter((m) => isModuleEnabled(settings, m.key));
}

export function moduleForPath(pathname: string): ModuleDef | null {
  return MODULES.find((m) => pathname === m.href || pathname.startsWith(m.href + "/")) ?? null;
}
