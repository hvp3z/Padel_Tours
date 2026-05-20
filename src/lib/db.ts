import { Pool } from "pg";
import { env } from "./env";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    if (!env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set. Copy .env.example to .env and configure it.");
    }
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
    });
  }
  return pool;
}

export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  const res = await getPool().query(text, params as never[]);
  return res.rows as T[];
}
