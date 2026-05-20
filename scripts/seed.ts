import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Client } from "pg";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://padel:padel@localhost:5433/padel_tours";

interface ClubRow {
  slug: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  lat: number;
  lng: number;
  courtsCount: number;
  provider: string;
  externalId: string;
  bookingBaseUrl: string;
  notes?: string;
}

function parseCsv(text: string): ClubRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headerLine = lines.shift();
  if (!headerLine) return [];
  const header = headerLine.split(",");

  return lines.map((line) => {
    const fields = splitCsvLine(line);
    const row: Record<string, string> = {};
    header.forEach((h, i) => {
      row[h] = (fields[i] ?? "").trim();
    });
    return {
      slug: row.slug ?? "",
      name: row.name ?? "",
      address: row.address ?? "",
      postalCode: row.postalCode ?? "",
      city: row.city ?? "",
      lat: Number.parseFloat(row.lat ?? "0"),
      lng: Number.parseFloat(row.lng ?? "0"),
      courtsCount: Number.parseInt(row.courtsCount ?? "1", 10),
      provider: row.provider ?? "custom",
      externalId: row.externalId ?? "",
      bookingBaseUrl: row.bookingBaseUrl ?? "",
      notes: row.notes ?? undefined,
    };
  });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"') {
      cur += '"';
      i++;
    } else if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

async function main() {
  const csvPath = resolve(process.cwd(), "data/clubs.csv");
  const csv = await readFile(csvPath, "utf8");
  const rows = parseCsv(csv);
  console.log(`[seed] Parsed ${rows.length} clubs from ${csvPath}`);

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  for (const r of rows) {
    if (!r.slug || !r.name) {
      console.warn(`[seed] Skipping row with missing slug/name`, r);
      continue;
    }
    await client.query(
      `
      INSERT INTO clubs (slug, name, address, postal_code, city, location, courts_count, provider, external_id, booking_base_url, notes)
      VALUES ($1, $2, $3, $4, $5, ST_MakePoint($7, $6)::geography, $8, $9, $10, $11, $12)
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        postal_code = EXCLUDED.postal_code,
        city = EXCLUDED.city,
        location = EXCLUDED.location,
        courts_count = EXCLUDED.courts_count,
        provider = EXCLUDED.provider,
        external_id = EXCLUDED.external_id,
        booking_base_url = EXCLUDED.booking_base_url,
        notes = EXCLUDED.notes,
        updated_at = now()
      `,
      [
        r.slug,
        r.name,
        r.address,
        r.postalCode,
        r.city,
        r.lat,
        r.lng,
        r.courtsCount,
        r.provider,
        r.externalId,
        r.bookingBaseUrl,
        r.notes ?? null,
      ],
    );
    console.log(`[seed] Upserted ${r.slug} (${r.provider})`);
  }

  await client.end();
  console.log(`[seed] Done.`);
}

main().catch((err) => {
  console.error("[seed] failed", err);
  process.exit(1);
});
