export type Member = {
  id: string;
  name: string;
  role: "parent" | "child";
  color: string;
  birthday: string | null;
  notes: string | null;
  user_id: string | null;
  sort_order: number;
};

export type Task = {
  id: string;
  title: string;
  assigned_to: string | null;
  due_date: string;
  done: boolean;
  notes: string | null;
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
