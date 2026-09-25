import { buildPlan } from "@/lib/assistant";
import { preparePlanContext } from "@/lib/assistantContext";

// "Contale a Lovebug": devuelve el plan en streaming (una línea JSON por evento) para que la
// pantalla vaya mostrando lo que encuentra mientras Claude escribe:
//   {"t":"delta","v":"…"}  pedazo del JSON que está escribiendo
//   {"t":"done","plan":{…}} plan final, ya validado
//   {"t":"error","error":"…"}
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
  const prepared = await preparePlanContext(typeof body?.text === "string" ? body.text : "");
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: object) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      if (!prepared.ok) {
        send({ t: "error", error: prepared.error });
        controller.close();
        return;
      }
      const result = await buildPlan(prepared.ctx, (delta) => send({ t: "delta", v: delta }));
      if (result.ok) {
        await prepared.logUsage().catch(() => {});
        send({ t: "done", plan: result.plan });
      } else {
        send({ t: "error", error: result.error });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" },
  });
}
