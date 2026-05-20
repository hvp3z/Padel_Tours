import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Client } from "pg";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://padel:padel@localhost:5433/padel_tours";

async function main() {
  const sqlPath = resolve(process.cwd(), "infra/schema.sql");
  const sql = await readFile(sqlPath, "utf8");

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log(`[migrate] Connected to ${DATABASE_URL}`);
  await client.query(sql);
  console.log(`[migrate] Applied ${sqlPath}`);
  await client.end();
}

main().catch((err) => {
  console.error("[migrate] failed", err);
  process.exit(1);
});
