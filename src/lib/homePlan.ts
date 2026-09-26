import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { GRID, placeRooms, ROOM_KINDS, ROOM_STYLE, type RoomDraft } from "@/lib/home";

// "Dibujá mi casa": con fotos de los ambientes y lo que la familia cuenta (escrito o dictado),
// Claude propone un plano aproximado en la grilla. Es un boceto para arrancar: después se ajusta a mano.

export type HomeSketch = { summary: string; rooms: RoomDraft[] };
export type SketchResult = { ok: true; sketch: HomeSketch } | { ok: false; error: string };

export const MAX_PHOTOS = 6;

const schema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    rooms: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          kind: { type: "string", enum: [...ROOM_KINDS] },
          floor: { type: "integer" },
          x: { type: "integer" },
          y: { type: "integer" },
          w: { type: "integer" },
          h: { type: "integer" },
        },
        required: ["name", "kind", "floor", "x", "y", "w", "h"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "rooms"],
  additionalProperties: false,
};

const kinds = ROOM_KINDS.map((k) => `${k} (${ROOM_STYLE[k].label})`).join(", ");

const SYSTEM = `Sos quien dibuja el plano de una casa o departamento para Lovebug, una app de organización familiar de Argentina. Con lo que la familia cuenta y las fotos que manda, armás un plano visto desde arriba, aproximado pero creíble, que después van a poder ajustar a mano.

La grilla:
- Cada piso es una grilla de ${GRID} × ${GRID}; 1 cuadradito ≈ 1 metro. x crece hacia la derecha, y hacia abajo. y = 0 es el frente (la calle o la entrada).
- Cada ambiente es un rectángulo: x, y (esquina de arriba a la izquierda), w (ancho) y h (largo). Todo entero, x + w ≤ ${GRID}, y + h ≤ ${GRID}.
- floor: 0 = planta baja, 1 = primer piso, 2, 3; -1 = subsuelo. Un departamento en un piso alto igual va en 0.

Cómo armarlo:
- Los ambientes NO se superponen, y los que están al lado comparten pared (se tocan borde con borde, sin huecos raros). Todo el piso forma un bloque compacto, arrancando en x = 0, y = 0.
- Tamaños realistas: dormitorio 3×3 a 4×4, principal hasta 4×5; baño 2×2 o 2×3; cocina 3×3 a 3×4; living 4×5 a 6×6; comedor 3×4; lavadero 2×2; pasillo de 1 de ancho; patio o jardín grande al fondo (y alto) o adelante si lo dicen.
- Respetá lo que cuentan: cuántos dormitorios, qué da a qué ("la cocina da al patio", "el baño está entre los cuartos"), en qué piso está cada cosa. Si algo no lo dicen, ubicalo donde suele estar en una casa argentina.
- Las fotos sirven para saber qué ambientes hay, qué tan grandes son y qué se ve desde dónde (una puerta, una ventana al patio). No inventes ambientes que no aparezcan ni en el texto ni en las fotos, salvo un pasillo o entrada si hace falta para conectar.
- name: corto y como lo diría la familia ("Cuarto de Mica", "Baño de arriba", "Living"). Si nombran de quién es un cuarto, usalo.
- kind, uno de: ${kinds}.
- Máximo 20 ambientes en total.
- summary: 1 o 2 oraciones cálidas, en voseo rioplatense, contando qué armaste y que es un boceto que pueden acomodar tocando cada ambiente. Sin saludos.`;

export async function sketchHome(input: { description: string; photos: string[] }): Promise<SketchResult> {
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: "La IA no está configurada todavía." };

  const images: Anthropic.ImageBlockParam[] = input.photos.slice(0, MAX_PHOTOS).flatMap((url) => {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(url);
    return m ? [{ type: "image" as const, source: { type: "base64" as const, media_type: m[1] as "image/jpeg" | "image/png" | "image/webp", data: m[2] } }] : [];
  });
  const text = input.description.trim()
    ? `Así es nuestra casa:\n${input.description.trim()}`
    : "No escribimos nada: armalo solo con las fotos.";

  const client = new Anthropic();
  const started = Date.now();
  try {
    const stream = client.messages.stream({
      model: "claude-opus-5",
      max_tokens: 4000,
      thinking: { type: "disabled" },
      output_config: { effort: "medium", format: { type: "json_schema", schema } },
      system: SYSTEM,
      messages: [{ role: "user", content: [...images, { type: "text", text }] }],
    });
    const response = await stream.finalMessage();
    console.info(`[home] sketch in ${Date.now() - started}ms · ${images.length} fotos · in ${response.usage.input_tokens} · out ${response.usage.output_tokens}`);
    if (response.stop_reason === "refusal") return { ok: false, error: "No pude dibujarla con eso. Probá contándolo de otra forma." };
    if (response.stop_reason === "max_tokens") return { ok: false, error: "Era mucho para una sola vez. Probá con menos ambientes." };

    const raw = JSON.parse(
      response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
    ) as { summary?: string; rooms?: unknown[] };
    const rooms = placeRooms((raw.rooms ?? []) as Partial<RoomDraft>[], 20);
    if (!rooms.length) return { ok: false, error: "No me quedó claro cómo es la casa. Contame qué ambientes tiene y cómo están ubicados." };
    return { ok: true, sketch: { summary: String(raw.summary ?? "").slice(0, 400), rooms } };
  } catch (e) {
    console.error("[home] sketch failed:", e instanceof Error ? e.message : e);
    if (e instanceof Anthropic.RateLimitError) return { ok: false, error: "La IA está con mucha demanda. Probá en un ratito." };
    if (e instanceof Anthropic.APIError && /credit/i.test(e.message)) return { ok: false, error: "Se terminaron los créditos de la IA. Avisale a quien administra Lovebug." };
    return { ok: false, error: "No pude dibujarla esta vez. Probá de nuevo en un momento." };
  }
}
