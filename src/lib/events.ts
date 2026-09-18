import type { EventGuest, EventItemCategory, FamilyEvent, MenuItem } from "@/lib/types";

export const EVENT_ITEM_CATEGORIES: Record<EventItemCategory, string> = {
  bebidas: "Bebidas",
  comida: "Comida extra",
  decoracion: "Decoración",
  vajilla: "Vajilla y descartables",
  otro: "Otros",
};

// Categoría de la lista de compras que mejor le pega a cada rubro del evento.
export const EVENT_ITEM_TO_SHOPPING: Record<EventItemCategory, "almacen" | "frescos" | "limpieza" | "chicos" | "farmacia" | "otro"> = {
  bebidas: "almacen",
  comida: "frescos",
  decoracion: "otro",
  vajilla: "limpieza",
  otro: "otro",
};

export function menuKey(item: MenuItem, index: number): string {
  return item.key ?? `m${index}`;
}

// Cuántas porciones/unidades de un plato hacen falta: suma por invitado (con ajustes), o el total fijo.
export function menuItemTotal(item: MenuItem, index: number, guests: EventGuest[], fallbackGuests: number): number {
  const key = menuKey(item, index);
  const perAdult = item.per_adult ?? 1;
  const perChild = item.per_child ?? Math.max(0.5, perAdult / 2);
  const confirmed = guests.filter((g) => g.confirmed);
  // Sin lista de invitados: vale el total fijo que cargaron en el plato.
  if (confirmed.length === 0) return item.portions || Math.ceil(fallbackGuests * perAdult - 1e-9);
  const sum = confirmed.reduce((acc, g) => acc + (g.portions?.[key] ?? (g.is_child ? perChild : perAdult)), 0);
  return Math.ceil(sum - 1e-9);
}

export function guestPortion(item: MenuItem, index: number, guest: EventGuest): number {
  const key = menuKey(item, index);
  const perAdult = item.per_adult ?? 1;
  const perChild = item.per_child ?? Math.max(0.5, perAdult / 2);
  return guest.portions?.[key] ?? (guest.is_child ? perChild : perAdult);
}

export function confirmedCount(event: FamilyEvent, guests: EventGuest[]): number {
  const confirmed = guests.filter((g) => g.confirmed).length;
  return guests.length ? confirmed : event.guests;
}

export function formatPortion(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100).replace(".", ",");
}
