import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { addDays } from "@/lib/format";
import type { Contact, Member } from "@/lib/types";

// "Contale a Lovebug": le contás (hablando o escribiendo) lo que tenés hoy y en los próximos días,
// y Claude lo reparte en calendario, logística, tareas, compras, vencimientos y menú. No carga nada
// solo: devuelve un plan que la persona revisa y aprueba (ver applyPlan en actions/assistant.ts).

export const PLAN_KINDS = ["evento", "viaje", "tarea", "compra", "recordatorio", "comida"] as const;
export type PlanKind = (typeof PLAN_KINDS)[number];

export const EVENT_CATEGORIES = ["colegio", "salud", "actividades", "social", "casa", "plata", "familia", "trabajo"] as const;
export const SHOPPING_CATEGORIES = ["almacen", "frescos", "limpieza", "chicos", "farmacia", "otro"] as const;
export const REMINDER_CATEGORIES = ["seguro", "servicio", "impuesto", "colegio", "salud", "auto", "casa", "otro"] as const;
export const MEAL_SLOTS = ["almuerzo", "cena"] as const;
export const TRANSPORTS = ["auto", "colectivo", "caminando", "bici", "moto", "otro"] as const;

export type PlanItem = {
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
  amount: number | null; // recordatorio: monto a pagar
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
  upcoming: { title: string; when: string }[];
  enabled: { logistica: boolean; compras: boolean; vencimientos: boolean; menu: boolean };
};

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function nullable(schema: Record<string, unknown>) {
  return { anyOf: [schema, { type: "null" }] };
}

function planSchema(memberIds: string[]) {
  const member = memberIds.length ? nullable({ type: "string", enum: memberIds }) : { type: "null" };
  const categories = [...new Set<string>([...EVENT_CATEGORIES, ...SHOPPING_CATEGORIES, ...REMINDER_CATEGORIES, ...MEAL_SLOTS])];
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
          required: ["kind", "title", "date", "time", "end_time", "member_id", "driver_id", "origin", "place", "category", "transport", "quantity", "amount", "notes", "suggested"],
          properties: {
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
  const upcoming = ctx.upcoming.length ? ctx.upcoming.map((u) => `- ${u.when}: ${u.title}`).join("\n") : "(nada)";

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
  ].join("\n");

  return `Sos el asistente de Lovebug, una app de organización familiar argentina. Te cuentan, como en un audio de WhatsApp, lo que tienen hoy y los próximos días. Tu trabajo: convertir TODO lo que cuentan en cosas concretas para cargar en la app, repartidas en el tipo que corresponde y en el día que corresponde (no solo hoy: también mañana, el fin de semana o la semana que viene).

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

Ya cargado en el calendario (no lo dupliques; si lo mencionan, no lo vuelvas a crear):
${upcoming}

Tipos de ítem:
${kinds}

Reglas:
- Un ítem por cosa. Un mismo relato suele generar varios tipos a la vez: la reunión es un evento, retirar al nene después es un viaje, comprar la bolsa de dormir es una tarea para ese día y la bolsa es una compra.
- Nombres: si mencionan a alguien que es integrante (aunque usen un apodo o diminutivo, ej. "Juani" o "Juana" por "Juanita"), usá su id. Si es alguien de afuera o que no está cargado (un hijo que todavía no está en la app, los abuelos), no inventes ids: nombralo en el título.
- No inventes horas, lugares ni personas. Si no lo dijeron, null. Si algo importante quedó ambiguo (quién la lleva, si "Juana" y "Juani" son la misma persona, a qué hora), preguntalo en questions (máximo 4, cortas, en voseo, lo más importante primero). Si mencionan a alguien de la casa que no está en la app (ej. otro hijo), preguntá si quieren sumarlo en Familia.
- Podés sugerir lo que obviamente hace falta y no dijeron con detalle (ej. "todas las cosas de camping" → bolsa de dormir, linterna, repelente, protector solar, cantimplora; máximo 8), con suggested: true. Todo lo que sí dijeron va con suggested: false.
- Títulos cortos y naturales, en español rioplatense, que se entiendan solos en una lista: "Reunión de padres en el jardín de Salvador", "Misa de promesa de las guías de Juana", "Buscar a Juana en la Catedral de San Miguel".
- Días sueltos ("el jueves", "el martes") son el PRÓXIMO de ese nombre a partir de hoy, aunque en el relato aparezcan después de fechas más lejanas: la gente no cuenta en orden. Si por contexto claramente es otro, preguntalo.
- Horas en formato 24 h (las 4 de la tarde = 16:00, las 8 de la noche = 20:00, las 8 de la mañana = 08:00).
- summary: 1 o 2 oraciones cálidas, en voseo, que resuman lo que entendiste (días y momentos clave). Sin saludos largos.
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
      output_config: { effort: "low", format: { type: "json_schema", schema: planSchema(ctx.members.map((m) => m.id)) } },
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
    return { ok: true, plan: sanitize(plan, ctx) };
  } catch (e) {
    console.error("[assistant] plan failed:", e instanceof Error ? e.message : e);
    if (e instanceof Anthropic.RateLimitError) return { ok: false, error: "La IA está con mucha demanda. Probá en un ratito." };
    if (e instanceof Anthropic.APIError && /credit/i.test(e.message)) return { ok: false, error: "Se terminaron los créditos de la IA. Avisale a quien administra Lovebug." };
    return { ok: false, error: "No pude ordenarlo esta vez. Probá de nuevo en un momento." };
  }
}

// Deja el plan en valores que la base acepta aunque el modelo se desvíe (fechas raras, ids ajenos).
export function sanitize(plan: Plan, ctx: Pick<PlanContext, "today" | "members" | "enabled">): Plan {
  const ids = new Set(ctx.members.map((m) => m.id));
  const minDate = addDays(ctx.today, -1);
  const maxDate = addDays(ctx.today, 400);
  const okDate = (d: string | null) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= minDate && d <= maxDate ? d : null);
  const okTime = (t: string | null) => (t && /^([01]\d|2[0-3]):[0-5]\d$/.test(t) ? t : null);
  const okMember = (id: string | null) => (id && ids.has(id) ? id : null);
  const clip = (s: string | null, n: number) => (s ? s.trim().slice(0, n) || null : null);

  const items = (plan.items ?? [])
    .filter((i) => PLAN_KINDS.includes(i.kind) && i.title?.trim())
    .map<PlanItem>((i) => {
      let kind = i.kind;
      if (kind === "viaje" && !ctx.enabled.logistica) kind = "evento";
      if (kind === "compra" && !ctx.enabled.compras) kind = "tarea";
      if (kind === "recordatorio" && !ctx.enabled.vencimientos) kind = "tarea";
      if (kind === "comida" && !ctx.enabled.menu) kind = "tarea";
      return {
        kind,
        title: i.title.trim().slice(0, 140),
        date: kind === "compra" ? null : okDate(i.date),
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
        amount: kind === "recordatorio" && typeof i.amount === "number" && i.amount > 0 && i.amount < 1e10 ? Math.round(i.amount) : null,
        notes: clip(i.notes, 300),
        suggested: Boolean(i.suggested),
      };
    })
    .slice(0, 40);

  return {
    summary: (plan.summary ?? "").trim().slice(0, 500),
    items,
    questions: (plan.questions ?? []).map((q) => q.trim()).filter(Boolean).slice(0, 4),
  };
}
