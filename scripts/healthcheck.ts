/**
 * CLI healthcheck script — runs all adapter healthchecks + DB ping.
 * Can be wired to a cron (GitHub Actions, Railway cron, etc.) for daily monitoring.
 * Exits with code 1 if anything is down.
 */
import { Client } from "pg";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://padel:padel@localhost:5433/padel_tours";

async function pingDb(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    await client.query("SELECT 1");
    await client.end();
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: String(err) };
  }
}

async function main() {
  console.log("== Padel Tours healthcheck ==");
  const db = await pingDb();
  console.log(`DB: ${db.ok ? "OK" : "FAIL"} (${db.latencyMs}ms)${db.error ? " " + db.error : ""}`);

  const { allAdapters } = await import("../src/lib/adapters/registry");
  const adapters = await Promise.all(
    allAdapters().map(async (a) => {
      const res = await a.healthcheck?.();
      return { name: a.name, ...res };
    }),
  );

  for (const a of adapters) {
    console.log(`${a.name}: ${a.ok ? "OK" : "FAIL"} (${a.latencyMs}ms)${a.error ? " " + a.error : ""}`);
  }

  const ok = db.ok && adapters.every((a) => a.ok);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error("[healthcheck] failed", err);
  process.exit(1);
});
