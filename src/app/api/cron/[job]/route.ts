import { NextResponse, type NextRequest } from "next/server";
import { runJob } from "@/lib/notify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Cron (diaria y semanal) y GitHub Actions (cada hora, ver .github/workflows/cron-hourly.yml)
// llaman a estas rutas con "Authorization: Bearer $CRON_SECRET".
export async function GET(request: NextRequest, { params }: { params: Promise<{ job: string }> }) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { job } = await params;
  if (job !== "hourly" && job !== "daily" && job !== "weekly") {
    return NextResponse.json({ error: "unknown job" }, { status: 404 });
  }

  try {
    const result = await runJob(job);
    return NextResponse.json({ ok: true, job, ...result });
  } catch (e) {
    console.error("[cron]", job, e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "error" }, { status: 500 });
  }
}
