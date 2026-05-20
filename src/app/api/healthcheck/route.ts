import { NextResponse } from "next/server";
import { allAdapters } from "@/lib/adapters/registry";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const dbStart = Date.now();
  let dbStatus: { ok: boolean; latencyMs: number; error?: string };
  try {
    await getPool().query("SELECT 1");
    dbStatus = { ok: true, latencyMs: Date.now() - dbStart };
  } catch (err) {
    dbStatus = { ok: false, latencyMs: Date.now() - dbStart, error: String(err) };
  }

  const adapters = await Promise.all(
    allAdapters().map(async (a) => {
      const res = await a.healthcheck?.();
      return { name: a.name, ...res };
    }),
  );

  const ok = dbStatus.ok && adapters.every((a) => a.ok);

  return NextResponse.json(
    {
      ok,
      timestamp: new Date().toISOString(),
      db: dbStatus,
      adapters,
    },
    { status: ok ? 200 : 503 },
  );
}
