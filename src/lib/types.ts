export type Member = {
  id: string;
  name: string;
  role: string; // texto libre: "Mamá", "Abuela", "Amigo"…
  is_child: boolean;
  color: string;
  birthday: string | null;
  notes: string | null;
  user_id: string | null;
  sort_order: number;
  nickname: string | null;
  photo_url: string | null;
  dni: string | null;
  phone: string | null;
  blood_type: string | null;
  allergies: string | null;
  school: string | null;
  doctor: string | null;
  share_location: boolean;
};

export type DocumentKind = "dni" | "vacunas" | "ficha_medica" | "colegio" | "seguro" | "otro";

export type FamilyDocument = {
  id: string;
  member_id: string | null;
  title: string;
  kind: DocumentKind;
  file_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

export type Task = {
  id: string;
  title: string;
  assigned_to: string | null;
  due_date: string;
  done: boolean;
  notes: string | null;
  points: number;
  event_id: string | null;
};

export type ShoppingCategory = "almacen" | "frescos" | "limpieza" | "chicos" | "farmacia" | "otro";

export type ShoppingItem = {
  id: string;
  name: string;
  quantity: string | null;
  category: ShoppingCategory;
  checked: boolean;
  checked_at: string | null;
  added_by: string | null;
  created_at: string;
  event_id: string | null;
};

export type MealPlan = {
  id: string;
  day: string;
  slot: "almuerzo" | "cena";
  title: string;
  notes: string | null;
  recipe_id: string | null;
  portions: number | null;
};

export type ReminderCategory = "seguro" | "servicio" | "impuesto" | "colegio" | "salud" | "auto" | "casa" | "otro";

export type Reminder = {
  id: string;
  title: string;
  due_date: string;
  category: ReminderCategory;
  amount: number | null;
  member_id: string | null;
  notify_days_before: number;
  repeat: "none" | "monthly" | "yearly";
  repeat_until: string | null; // último mes en que aparece; vacío = para siempre
  done: boolean;
  notes: string | null;
};

export type ImportantDate = {
  id: string;
  title: string;
  month: number;
  day: number;
  year: number | null;
  kind: "cumple" | "aniversario" | "otro";
  member_id: string | null;
  remind_days_before: number;
  gift_ideas: string | null;
};

export type PointsEntry = {
  id: string;
  member_id: string;
  points: number;
  reason: string | null;
  ref_id: string | null;
  created_at: string;
};

export type Reward = {
  id: string;
  title: string;
  cost: number;
  emoji: string | null;
  active: boolean;
};

export type Budget = {
  id: string;
  category: string;
  monthly_limit: number;
};

export type MemberLocation = {
  member_id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  updated_at: string;
};

export type Transport = "auto" | "colectivo" | "caminando" | "bici" | "moto" | "otro";

export type Trip = {
  id: string;
  trip_date: string;
  member_id: string | null;
  driver_id: string | null;
  origin: string | null;
  destination: string;
  departure_time: string | null;
  arrival_time: string | null;
  transport: Transport;
  meet_with: string | null;
  notes: string | null;
  done: boolean;
};

export type EventCategory =
  | "colegio"
  | "salud"
  | "actividades"
  | "social"
  | "casa"
  | "plata"
  | "familia"
  | "trabajo";

export type CalendarEvent = {
  id: string;
  title: string;
  category: EventCategory;
  member_id: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  notes: string | null;
};

export type ExpenseCategory =
  | "super"
  | "casa"
  | "chicos"
  | "auto"
  | "salud"
  | "ocio"
  | "ropa"
  | "servicios"
  | "alquiler"
  | "educacion"
  | "otro";

export type Expense = {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  paid_by: string | null;
  spent_at: string;
  is_fixed: boolean;
  event_id: string | null;
  receipt_path: string | null;
  is_draft: boolean; // "modo borrador": hipótesis para un mes futuro, no cuenta como real
};

export type IncomeSource = "sueldo" | "freelance" | "proyecto" | "anses" | "reintegro" | "otro";

export type Income = {
  id: string;
  description: string;
  amount: number;
  source: IncomeSource;
  member_id: string | null;
  received_at: string;
  is_recurring: boolean;
  is_draft: boolean;
};

// ── Cuentas recurrentes: estado por mes calendario ────────
export type BillCycleStatus = "pendiente" | "pausada" | "pagada";

export type BillCycle = {
  id: string;
  reminder_id: string;
  month: string; // primer día del mes: "2026-10-01"
  status: BillCycleStatus;
  amount: number | null;
  expense_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SavingsGoal = {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  member_id: string | null;
};

export type Horizon = "today" | "week" | "month" | "quarter";

export type Project = {
  id: string;
  title: string;
  description: string | null;
  horizon: Horizon;
  status: "todo" | "in_progress" | "done";
  progress: number;
  due_date: string | null;
  member_id: string | null;
};

export type DailyContent = {
  day: string;
  verse_text: string | null;
  verse_reference: string | null;
  reflection: string | null;
  prayer_title: string | null;
  prayer_text: string | null;
  saint: string | null;
  horoscope: Partial<Record<string, string>> | null; // clave: signo en español (aries, tauro, …)
  source: string | null;
};

// ── Cocina y eventos ──────────────────────────────────────
export type Ingredient = { name: string; quantity: number | null; unit: string };

export type PantryItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: ShoppingCategory;
  notes: string | null;
  updated_at: string;
};

export type Recipe = {
  id: string;
  title: string;
  portions: number;
  ingredients: Ingredient[];
  steps: string | null;
  prep_minutes: number | null;
  tags: string[];
};

// Plato del evento. "portions" es el total fijo (cuando no hay invitados cargados);
// con invitados, el total sale de per_adult / per_child por cada uno (más ajustes por persona).
export type MenuItem = {
  key?: string;
  recipe_id: string | null;
  title: string;
  portions: number;
  per_adult?: number;
  per_child?: number;
};

export type EventGuest = {
  id: string;
  event_id: string;
  name: string;
  member_id: string | null;
  contact_id: string | null; // vínculo con el Círculo (gente fuera del hogar)
  is_child: boolean;
  confirmed: boolean;
  notes: string | null;
  portions: Record<string, number>; // key del plato → cantidad especial
  sort_order: number;
  created_at: string;
};

// ── División de gastos de un evento ──────────────────────
export type EventSplit = {
  id: string;
  event_id: string;
  method: "equal" | "manual";
  payer_member_id: string | null;
  payment_info: string | null; // alias, CBU o link de pago, texto libre
  share_token: string;
  created_at: string;
  updated_at: string;
};

export type EventSplitShare = {
  id: string;
  event_split_id: string;
  guest_id: string;
  amount: number;
  status: "pendiente" | "pagado";
  paid_note: string | null;
  income_id: string | null;
  created_at: string;
};

// ── Círculo: familiares y amigos fuera del hogar ─────────
export type Contact = {
  id: string;
  household_id: string;
  name: string;
  relationship: string | null;
  photo_url: string | null;
  birthday: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  is_child: boolean;
  archived_at: string | null;
  created_at: string;
};

export type EventItemCategory = "comida" | "bebidas" | "decoracion" | "vajilla" | "otro";

export type EventItem = {
  id: string;
  event_id: string;
  category: EventItemCategory;
  name: string;
  quantity: string | null;
  store: string | null;
  estimated_cost: number | null;
  done: boolean;
  notes: string | null;
  created_at: string;
};

export type AttachmentKind = "foto" | "video" | "audio" | "ticket" | "archivo";

export type EventAttachment = {
  id: string;
  event_id: string;
  kind: AttachmentKind;
  title: string | null;
  file_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  duration_seconds: number | null;
  created_at: string;
};

// ── Passkeys (huella / cara / PIN del celu) ──────────────
export type UserPasskey = {
  id: string;
  user_id: string;
  device_label: string | null;
  transports: string[] | null;
  created_at: string;
  last_used_at: string | null;
};

export type FamilyEvent = {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  location: string | null;
  guests: number;
  budget: number | null;
  notes: string | null;
  menu: MenuItem[];
  status: "planning" | "done";
  memory_note: string | null;
  created_at: string;
};

// ── Hogares (multi-familia) ──────────────────────────────
export type Tradition = "catolica" | "cristiana" | "judia" | "ninguna" | "otra";
export type HouseholdSettings = {
  modules?: Record<string, boolean>; // clave del módulo → activado (por defecto todos)
  inspiration?: {
    tradition?: Tradition; // qué lectura espiritual ver en Hoy (sin elegir → se pregunta la primera vez)
    horoscope?: boolean;
    gospel?: boolean; // legado: false equivale a tradition "ninguna"
    otherLabel?: string; // cuando tradition es "otra": qué religión pidieron (para mostrarlo en Hoy)
  };
  biometrics?: { enabled?: boolean }; // recordatorio de "activar huella" ya visto
  calendarFeed?: { version: number }; // suscripción al calendario: subirla invalida el link anterior
};

export type TraditionRequest = {
  id: string;
  household_id: string | null;
  user_id: string | null;
  label: string;
  note: string | null;
  status: "nuevo" | "en_curso" | "listo" | "descartado";
  created_at: string;
};

export type Household = {
  id: string;
  name: string;
  invite_code: string;
  settings: HouseholdSettings;
  created_by: string | null;
  created_at: string;
};

export type Profile = {
  user_id: string;
  household_id: string | null;
  email: string | null;
  last_seen_at: string | null;
  installed_at: string | null;
  created_at: string;
};
