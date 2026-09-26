import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { addDays } from "@/lib/format";
import { EXPENSE_CATEGORIES as EXPENSE_LABELS } from "@/lib/labels";
import type { Contact, Member } from "@/lib/types";

// "Contale a Lovebug": le contás (hablando o escribiendo) lo que tenés hoy y en los próximos días,
// y Claude lo reparte en calendario, logística, tareas, compras, vencimientos y menú — y también
// cambia o cancela lo que ya estaba cargado ("pasá la reunión a las 17", "cancelá lo del domingo").
// No toca nada solo: devuelve un plan que la persona revisa y aprueba (applyPlan en actions/assistant.ts).

export const PLAN_KINDS = ["evento", "viaje", "tarea", "compra", "recordatorio", "comida", "evento_familiar", "presupuesto"] as const;
export type PlanKind = (typeof PLAN_KINDS)[number];

export const PLAN_ACTIONS = ["crear", "modificar", "cancelar"] as const;
export type PlanAction = (typeof PLAN_ACTIONS)[number];

export const EVENT_CATEGORIES = ["colegio", "salud", "actividades", "social", "casa", "plata", "familia", "trabajo"] as const;
export const SHOPPING_CATEGORIES = ["almacen", "frescos", "limpieza", "chicos", "farmacia", "otro"] as const;
export const REMINDER_CATEGORIES = ["seguro", "servicio", "impuesto", "colegio", "salud", "auto", "casa", "otro"] as const;
export const MEAL_SLOTS = ["almuerzo", "cena"] as const;
export const TRANSPORTS = ["auto", "colectivo", "caminando", "bici", "moto", "otro"] as const;
export const EXPENSE_KEYS = Object.keys(EXPENSE_LABELS) as (keyof typeof EXPENSE_LABELS)[];

// Algo que ya está cargado, con una referencia corta ("C3", "V1") para que Claude la nombre sin
// tener que copiar ids largos. El servidor la traduce al id real antes de mostrar el plan.
export type ExistingItem = { ref: string; kind: PlanKind; id: string; label: string };

// Lo que se va a cambiar o borrar (lo agrega el servidor; en "crear" es null).
export type PlanTarget = { id: string; label: string };

export type PlanItem = {
  action: PlanAction;
  ref: string | null; // modificar/cancelar: la referencia de la lista de "ya cargado"
  target?: PlanTarget | null;
  kind: PlanKind;
  title: string;
  date: string | null; // YYYY-MM-DD
  time: string | null; // HH:MM (evento: empieza; viaje: sale o hay que estar)
  end_time: string | null; // HH:MM (evento: termina; viaje: llega)
  member_id: string | null; // de quién es / quién viaja / a quién se le asigna
  driver_id: string | null; // viaje: quién lleva o busca
  origin: string | null; // viaje: desde dónde
  place: string | null; // evento: dónde · viaje: adónde
  category: string | null; // según el tipo (ver prompt)
  transport: string | null; // viaje
  quantity: string | null; // compra
  amount: number | null; // recordatorio: monto · evento_familiar: presupuesto · presupuesto: tope mensual
  guests: number | null; // evento_familiar: cantidad de invitados
  notes: string | null;
  suggested: boolean; // lo agregó Lovebug como idea (ej. qué llevar a un campamento), no lo dijiste vos
};

export type Plan = {
  summary: string;
  items: PlanItem[];
  questions: string[];
};

export type PlanContext = {
  text: string;
  now: Date;
  today: string;
  householdName: string | null;
  members: Member[];
  me: Member | null;
  contacts: Pick<Contact, "name" | "relationship">[];
  existing: ExistingItem[];
  enabled: { logistica: boolean; compras: boolean; vencimientos: boolean; menu: boolean };
};

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function nullable(schema: Record<string, unknown>) {
  return { anyOf: [schema, { type: "null" }] };
}

function planSchema(memberIds: string[], refs: string[]) {
  const member = memberIds.length ? nullable({ type: "string", enum: memberIds }) : { type: "null" };
  const ref = refs.length ? nullable({ type: "string", enum: refs }) : { type: "null" };
  const categories = [...new Set<string>([...EVENT_CATEGORIES, ...SHOPPING_CATEGORIES, ...REMINDER_CATEGORIES, ...MEAL_SLOTS, ...EXPENSE_KEYS])];
  return {
    type: "object",
    additionalProperties: false,
    required: ["summary", "items", "questions"],
    properties: {
      summary: { type: "string" },
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["action", "ref", "kind", "title", "date", "time", "end_time", "member_id", "driver_id", "origin", "place", "category", "transport", "quantity", "amount", "guests", "notes", "suggested"],
          properties: {
            action: { type: "string", enum: [...PLAN_ACTIONS] },
            ref,
            kind: { type: "string", enum: [...PLAN_KINDS] },
            title: { type: "string" },
            date: nullable({ type: "string", description: "YYYY-MM-DD" }),
            time: nullable({ type: "string", description: "HH:MM, 24 h" }),
            end_time: nullable({ type: "string", description: "HH:MM, 24 h" }),
            member_id: member,
            driver_id: member,
            origin: nullable({ type: "string" }),
            place: nullable({ type: "string" }),
            category: nullable({ type: "string", enum: categories }),
            transport: nullable({ type: "string", enum: [...TRANSPORTS] }),
            quantity: nullable({ type: "string" }),
            amount: nullable({ type: "number" }),
            guests: nullable({ type: "integer" }),
            notes: nullable({ type: "string" }),
            suggested: { type: "boolean" },
          },
        },
      },
      questions: { type: "array", items: { type: "string" } },
    },
  };
}

function systemPrompt(ctx: PlanContext): string {
  const nowHM = ctx.now.toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit", hour12: false });
  const days = Array.from({ length: 21 }, (_, i) => {
    const d = addDays(ctx.today, i);
    const wd = WEEKDAYS[new Date(`${d}T12:00:00-03:00`).getUTCDay()];
    return `${d} ${wd}${i === 0 ? " (hoy)" : i === 1 ? " (mañana)" : ""}`;
  }).join("\n");
  const members = ctx.members
    .map((m) => {
      const bits = [m.role, m.is_child ? "menor" : null, m.nickname ? `le dicen ${m.nickname}` : null, m.school ? `colegio/trabajo: ${m.school}` : null].filter(Boolean);
      return `- id ${m.id}: ${m.name} (${bits.join(", ")})`;
    })
    .join("\n");
  const contacts = ctx.contacts.length ? ctx.contacts.map((c) => `- ${c.name}${c.relationship ? ` (${c.relationship})` : ""}`).join("\n") : "(nadie cargado)";
  const existing = ctx.existing.length ? ctx.existing.map((e) => `- ${e.ref} · ${e.kind} · ${e.label}`).join("\n") : "(nada)";

  const kinds = [
    `- "evento": algo con día (y hora si la dijeron) al que hay que ir o que pasa: reunión, misa, turno médico, cumple, campamento. category: ${EVENT_CATEGORIES.join(", ")}. place = dónde. Si dura varios días (ej. campamento de sábado a lunes), un solo evento el primer día con notes "hasta el lunes 29".`,
    ctx.enabled.logistica
      ? `- "viaje": cada vez que alguien tiene que llevar, buscar o retirar a alguien, o ir a algún lado. member_id = quién viaja (ej. la nena que va al campamento), driver_id = quién la lleva o la busca (si lo dijeron; si habla en primera persona "tengo que", es quien habla). origin/place = desde/hacia. time = a qué hora sale o hay que pasar a buscar; si solo se sabe a qué hora hay que ESTAR allá (la misa es a las 20), poné esa hora en end_time (llega) y time null. transport: ${TRANSPORTS.join(", ")} (auto si no dicen). Un viaje es para llevar o buscar a alguien (o cuando van varios y hay que organizar quién maneja); si una persona va sola a algo, alcanza con el evento. Ida y vuelta de un campamento son dos viajes, pero buscar a alguien en un lugar y llevarlo directo a otro es UN solo viaje (origin = donde lo buscan, place = adonde lo llevan).`
      : `- (Logística está apagada: los traslados van como "evento".)`,
    `- "tarea": algo para hacer ese día sin hora fija ("comprar las cosas de camping", "firmar la autorización"). member_id = a quién se le asigna si se dijo. date = el día que conviene hacerlo (el que dijeron, o antes del evento que lo necesita).`,
    ctx.enabled.compras
      ? `- "compra": cada cosa a comprar, por separado. category: ${SHOPPING_CATEGORIES.join(", ")}. Poné el para qué entre paréntesis si ayuda: "Bolsa de dormir (campamento Juana)". quantity solo si dijeron una cantidad ("2 kilos", "3 paquetes"); si no, null. date = null.`
      : `- (Compras está apagado: lo que haya que comprar va como "tarea" "Comprar …".)`,
    ctx.enabled.vencimientos
      ? `- "recordatorio": fechas límite, pagos y trámites ("pagar la cuota del campamento antes del viernes"). category: ${REMINDER_CATEGORIES.join(", ")}. amount = monto en pesos si lo dijeron ("45 mil" = 45000).`
      : `- (Vencimientos está apagado: los pagos y trámites van como "tarea".)`,
    ctx.enabled.menu ? `- "comida": qué se come un día puntual si lo dicen ("el jueves cenamos pizza"). category: almuerzo o cena.` : `- (Menú está apagado: no uses "comida".)`,
    `- "evento_familiar": los eventos que organizan con invitados (cumples, asados) de la lista de ya cargado. Solo "modificar": fecha, hora, título, place, guests = cantidad de invitados, amount = presupuesto en pesos. Nunca los crees ni los canceles desde acá: si quieren cancelar uno entero, decilo en summary ("eso se borra desde Eventos") y no lo incluyas.`,
    `- "presupuesto": el tope de gasto por mes de una categoría. category: ${EXPENSE_KEYS.join(", ")}. amount = el tope en pesos. "crear" si esa categoría todavía no tiene tope, "modificar" si ya tiene (usá su ref), "cancelar" para sacarlo.`,
  ].join("\n");

  return `Sos el asistente de Lovebug, una app de organización familiar argentina. Te cuentan, como en un audio de WhatsApp, lo que tienen hoy y los próximos días, o lo que cambió. Tu trabajo: convertir TODO lo que cuentan en cosas concretas en la app — crear lo nuevo, y cambiar o cancelar lo que ya estaba cargado — en el tipo y el día que corresponde (no solo hoy: también mañana, el fin de semana o la semana que viene).

Hogar: ${ctx.householdName ?? "sin nombre"}
Integrantes (usá solo estos ids en member_id y driver_id):
${members || "(ninguno)"}
Quien habla: ${ctx.me ? `${ctx.me.name} (id ${ctx.me.id})` : "no sabemos quién (no asumas)"}
Familia y amigos de afuera (Círculo), para reconocer nombres:
${contacts}

Ahora son las ${nowHM} del ${WEEKDAYS[new Date(`${ctx.today}T12:00:00-03:00`).getUTCDay()]} ${ctx.today} (hora de Argentina).
Calendario de referencia para resolver "el sábado que viene", "el lunes", "pasado mañana":
${days}
"Este sábado" o "el sábado" = el próximo sábado. "El sábado que viene" / "el próximo sábado" = también el próximo, salvo que ese día sea mañana o pasado: ahí es dudoso (puede ser el de la otra semana); elegí el que mejor encaje con el resto del relato y confirmalo en questions ("¿El campamento es mañana sábado 26 o el sábado 3?"). Si un día que dicen no cuadra con el día de la semana, priorizá el día de la semana y preguntá.

Ya cargado en la app, cada cosa con su ref (no lo dupliques: si lo mencionan tal cual, no lo vuelvas a crear):
${existing}

Tipos de ítem:
${kinds}

Qué hacer con cada ítem (action):
- "crear": algo nuevo. ref = null.
- "modificar": cambiar algo que ya está en la lista ("pasá la reunión a las 17", "ahora son 30 invitados", "la luz son 52 mil", "subí el tope del super a 300 mil", "el viaje lo hace Jaz"). ref = su ref y kind = el tipo que figura al lado. title = el título actual tal cual, salvo que pidan cambiarle el nombre. En el resto de los campos poné SOLO lo que cambia; lo que queda igual va null. Reprogramar (otro día u otra hora) es modificar, no cancelar y crear de nuevo.
- "cancelar": sacar algo que ya está en la lista porque no va más ("cancelá", "no voy", "sacalo", "ya no hace falta", "me quedé dormido y no fui a…"). ref = su ref, kind = su tipo, title = su título, el resto null.
- Si piden cambiar o cancelar varias cosas ("todo lo del domingo", "las compras para el asado"), un ítem por cada cosa de la lista que corresponda. Si no está claro cuáles son, no adivines: preguntalo en questions.
- Nunca uses modificar o cancelar sin una ref de la lista, y nunca inventes refs. Si piden cambiar algo que no está en la lista, decilo en questions.

Reglas:
- Un ítem por cosa. Un mismo relato suele generar varios tipos a la vez: la reunión es un evento, retirar al nene después es un viaje, comprar la bolsa de dormir es una tarea para ese día y la bolsa es una compra.
- Nombres: si mencionan a alguien que es integrante (aunque usen un apodo o diminutivo, ej. "Juani" o "Juana" por "Juanita"), usá su id. Si es alguien de afuera o que no está cargado (un hijo que todavía no está en la app, los abuelos), no inventes ids: nombralo en el título.
- No inventes horas, lugares ni personas. Si no lo dijeron, null. Si algo importante quedó ambiguo (quién la lleva, si "Juana" y "Juani" son la misma persona, a qué hora), preguntalo en questions (máximo 4, cortas, en voseo, lo más importante primero). Si mencionan a alguien de la casa que no está en la app (ej. otro hijo), preguntá si quieren sumarlo en Familia.
- Podés sugerir lo que obviamente hace falta y no dijeron con detalle (ej. "todas las cosas de camping" → bolsa de dormir, linterna, repelente, protector solar, cantimplora; máximo 8), con suggested: true. Todo lo que sí dijeron va con suggested: false.
- Títulos cortos y naturales, en español rioplatense, que se entiendan solos en una lista: "Reunión de padres en el jardín de Salvador", "Misa de promesa de las guías de Juana", "Buscar a Juana en la Catedral de San Miguel".
- Días sueltos ("el jueves", "el martes") son el PRÓXIMO de ese nombre a partir de hoy, aunque en el relato aparezcan después de fechas más lejanas: la gente no cuenta en orden. Si por contexto claramente es otro, preguntalo.
- Horas en formato 24 h (las 4 de la tarde = 16:00, las 8 de la noche = 20:00, las 8 de la mañana = 08:00).
- summary: 1 o 2 oraciones cálidas, en voseo, que resuman lo que entendiste (días y momentos clave, y qué se cambia o se cancela). Sin saludos largos.
- Si no hay nada organizable en el mensaje, items vacío y explicalo en summary.`;
}

export type PlanResult = { ok: true; plan: Plan } | { ok: false; error: string };

// Va pasando el JSON a medida que Claude lo escribe (onText), para mostrar los ítems mientras piensa.
export async function buildPlan(ctx: PlanContext, onText?: (delta: string) => void): Promise<PlanResult> {
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: "La IA no está configurada todavía." };

  const client = new Anthropic();
  const started = Date.now();
  try {
    const stream = client.messages.stream({
      model: "claude-opus-5",
      max_tokens: 8000,
      // Sin razonamiento previo: arranca a escribir enseguida (el resumen y el primer ítem llegan en
      // ~8 s en vez de ~18 s) y en las pruebas resolvió igual de bien fechas, viajes y compras.
      thinking: { type: "disabled" },
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: planSchema(ctx.members.map((m) => m.id), ctx.existing.map((e) => e.ref)) },
      },
      system: systemPrompt(ctx),
      messages: [{ role: "user", content: ctx.text }],
    });
    if (onText) stream.on("text", (delta) => onText(delta));
    const response = await stream.finalMessage();
    console.info(`[assistant] plan in ${Date.now() - started}ms · in ${response.usage.input_tokens} · out ${response.usage.output_tokens}`);
    if (response.stop_reason === "refusal") return { ok: false, error: "No pude ayudarte con eso. Probá contándolo de otra forma." };
    if (response.stop_reason === "max_tokens") return { ok: false, error: "Era mucho para una sola vez. Probá contándolo en dos partes." };

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const plan = JSON.parse(text) as Plan;
    return { ok: true, plan: sanitize(resolveRefs(plan, ctx.existing), ctx) };
  } catch (e) {
    console.error("[assistant] plan failed:", e instanceof Error ? e.message : e);
    if (e instanceof Anthropic.RateLimitError) return { ok: false, error: "La IA está con mucha demanda. Probá en un ratito." };
    if (e instanceof Anthropic.APIError && /credit/i.test(e.message)) return { ok: false, error: "Se terminaron los créditos de la IA. Avisale a quien administra Lovebug." };
    return { ok: false, error: "No pude ordenarlo esta vez. Probá de nuevo en un momento." };
  }
}

// Traduce la ref ("C3") de cada cambio/cancelación a lo que ya está cargado. La ref manda sobre el
// tipo que haya puesto el modelo; una ref que no existe descarta el ítem (nunca se adivina).
export function resolveRefs(plan: Plan, existing: ExistingItem[]): Plan {
  const byRef = new Map(existing.map((e) => [e.ref, e]));
  const items = (plan.items ?? []).flatMap<PlanItem>((i) => {
    if (i.action !== "modificar" && i.action !== "cancelar") return [{ ...i, action: "crear", ref: null, target: null }];
    const hit = i.ref ? byRef.get(i.ref) : undefined;
    if (!hit) return [];
    return [{ ...i, kind: hit.kind, target: { id: hit.id, label: hit.label } }];
  });
  return { ...plan, items };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Lo que se puede crear desde acá (los eventos familiares y sus invitados se arman en Eventos).
const CREATABLE: PlanKind[] = ["evento", "viaje", "tarea", "compra", "recordatorio", "comida", "presupuesto"];

// Deja el plan en valores que la base acepta aunque el modelo se desvíe (fechas raras, ids ajenos).
// Se usa dos veces: al armar el plan y al aplicarlo (lo que vuelve del navegador pudo editarse).
export function sanitize(plan: Plan, ctx: Pick<PlanContext, "today" | "members" | "enabled">): Plan {
  const ids = new Set(ctx.members.map((m) => m.id));
  const minDate = addDays(ctx.today, -1);
  const maxDate = addDays(ctx.today, 400);
  const okDate = (d: string | null) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= minDate && d <= maxDate ? d : null);
  const okTime = (t: string | null) => (t && /^([01]\d|2[0-3]):[0-5]\d$/.test(t) ? t : null);
  const okMember = (id: string | null) => (id && ids.has(id) ? id : null);
  const clip = (s: string | null | undefined, n: number) => (s ? s.trim().slice(0, n) || null : null);
  const okMoney = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n > 0 && n < 1e10 ? Math.round(n) : null);

  const items = (plan.items ?? [])
    .filter((i) => PLAN_KINDS.includes(i.kind) && i.title?.trim())
    .flatMap<PlanItem>((i) => {
      const action: PlanAction = PLAN_ACTIONS.includes(i.action) ? i.action : "crear";
      const target = action !== "crear" && i.target && UUID.test(i.target.id) ? { id: i.target.id, label: clip(i.target.label, 200) ?? "" } : null;
      if (action !== "crear" && !target) return [];

      let kind = i.kind;
      if (action === "crear") {
        if (kind === "viaje" && !ctx.enabled.logistica) kind = "evento";
        if (kind === "compra" && !ctx.enabled.compras) kind = "tarea";
        if (kind === "recordatorio" && !ctx.enabled.vencimientos) kind = "tarea";
        if (kind === "comida" && !ctx.enabled.menu) kind = "tarea";
        if (!CREATABLE.includes(kind)) return [];
      }
      if (kind === "evento_familiar" && action !== "modificar") return [];
      // Un tope nuevo necesita una categoría de gasto válida (al modificar solo cambia el monto).
      if (kind === "presupuesto" && action === "crear" && !EXPENSE_KEYS.includes(i.category as (typeof EXPENSE_KEYS)[number])) return [];

      const base = { action, ref: action === "crear" ? null : i.ref ?? null, target, kind, title: i.title.trim().slice(0, 140), suggested: Boolean(i.suggested) };
      if (action === "cancelar") {
        return [{ ...base, date: null, time: null, end_time: null, member_id: null, driver_id: null, origin: null, place: null, category: null, transport: null, quantity: null, amount: null, guests: null, notes: null }];
      }
      return [
        {
          ...base,
          date: kind === "compra" || kind === "presupuesto" ? null : okDate(i.date),
          // "Llegar a las X" solo tiene sentido en un viaje; en lo demás, esa es la hora del evento.
          time: okTime(i.time) ?? (kind === "viaje" ? null : okTime(i.end_time)),
          end_time: kind !== "viaje" && !okTime(i.time) ? null : okTime(i.end_time),
          member_id: okMember(i.member_id),
          driver_id: kind === "viaje" ? okMember(i.driver_id) : null,
          origin: clip(i.origin, 120),
          place: clip(i.place, 120),
          category: i.category ?? null,
          transport: i.transport ?? null,
          quantity: clip(i.quantity, 40),
          amount: kind === "recordatorio" || kind === "evento_familiar" || kind === "presupuesto" ? okMoney(i.amount) : null,
          guests: kind === "evento_familiar" && typeof i.guests === "number" && i.guests >= 0 && i.guests < 10000 ? Math.round(i.guests) : null,
          notes: clip(i.notes, 300),
        },
      ];
    })
    .slice(0, 60);

  return {
    summary: (plan.summary ?? "").trim().slice(0, 500),
    items,
    questions: (plan.questions ?? []).map((q) => q.trim()).filter(Boolean).slice(0, 4),
  };
}
