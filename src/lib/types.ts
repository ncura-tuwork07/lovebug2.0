export type Member = {
  id: string;
  name: string;
  role: "parent" | "child";
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
};

export type IncomeSource = "sueldo" | "freelance" | "proyecto" | "anses" | "otro";

export type Income = {
  id: string;
  description: string;
  amount: number;
  source: IncomeSource;
  member_id: string | null;
  received_at: string;
  is_recurring: boolean;
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
  horoscope: { aries?: string; acuario?: string } | null;
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

export type MenuItem = { recipe_id: string | null; title: string; portions: number };

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
  created_at: string;
};
