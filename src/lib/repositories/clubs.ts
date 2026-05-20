import { query } from "../db";
import type { Club, ProviderName } from "../adapters/types";

interface ClubRow {
  id: string;
  slug: string;
  name: string;
  address: string;
  postal_code: string;
  city: string;
  lat: number;
  lng: number;
  courts_count: number;
  provider: ProviderName;
  external_id: string;
  booking_base_url: string;
  notes: string | null;
  distance_m: number;
}

function rowToClub(row: ClubRow): Club & { distanceMeters: number } {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    address: row.address,
    postalCode: row.postal_code,
    city: row.city,
    lat: Number(row.lat),
    lng: Number(row.lng),
    courtsCount: row.courts_count,
    provider: row.provider,
    externalId: row.external_id,
    bookingBaseUrl: row.booking_base_url,
    notes: row.notes ?? undefined,
    distanceMeters: Number(row.distance_m),
  };
}

export async function findClubsInRadius(
  lat: number,
  lng: number,
  radiusMeters: number,
): Promise<Array<Club & { distanceMeters: number }>> {
  const rows = await query<ClubRow>(
    `
    SELECT
      id, slug, name, address, postal_code, city,
      ST_Y(location::geometry) AS lat,
      ST_X(location::geometry) AS lng,
      courts_count, provider, external_id, booking_base_url, notes,
      ST_Distance(location, ST_MakePoint($2, $1)::geography) AS distance_m
    FROM clubs
    WHERE ST_DWithin(location, ST_MakePoint($2, $1)::geography, $3)
    ORDER BY distance_m ASC
    `,
    [lat, lng, radiusMeters],
  );
  return rows.map(rowToClub);
}

export async function listAllClubs(): Promise<Club[]> {
  const rows = await query<ClubRow>(
    `
    SELECT
      id, slug, name, address, postal_code, city,
      ST_Y(location::geometry) AS lat,
      ST_X(location::geometry) AS lng,
      courts_count, provider, external_id, booking_base_url, notes,
      0 AS distance_m
    FROM clubs
    ORDER BY name ASC
    `,
  );
  return rows.map(rowToClub);
}

export async function upsertClub(c: Omit<Club, "id">): Promise<void> {
  await query(
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
      c.slug,
      c.name,
      c.address,
      c.postalCode,
      c.city,
      c.lat,
      c.lng,
      c.courtsCount,
      c.provider,
      c.externalId,
      c.bookingBaseUrl,
      c.notes ?? null,
    ],
  );
}

export async function logAdapterCall(args: {
  provider: ProviderName;
  clubSlug: string;
  ok: boolean;
  latencyMs: number;
  slotCount?: number;
  error?: string;
}): Promise<void> {
  await query(
    `INSERT INTO adapter_logs (provider, club_slug, ok, latency_ms, slot_count, error) VALUES ($1, $2, $3, $4, $5, $6)`,
    [args.provider, args.clubSlug, args.ok, args.latencyMs, args.slotCount ?? null, args.error ?? null],
  );
}
