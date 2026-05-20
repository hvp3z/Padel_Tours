import { getAdapter } from "./adapters/registry";
import { AdapterError, type Club, type Slot } from "./adapters/types";
import { cached, defaultTtl } from "./cache";
import { findClubsInRadius } from "./repositories/clubs";

export interface SearchRequest {
  lat: number;
  lng: number;
  radiusKm: number;
  date: Date;
  startHour?: number;
  endHour?: number;
  durationMinutes: number;
}

export interface ClubResult {
  club: Club & { distanceMeters: number };
  slots: Slot[];
  error?: string;
}

export interface SearchResponse {
  query: {
    lat: number;
    lng: number;
    radiusKm: number;
    date: string;
    durationMinutes: number;
    startHour?: number;
    endHour?: number;
  };
  totalClubs: number;
  totalSlots: number;
  results: ClubResult[];
  errors: Array<{ clubSlug: string; provider: string; message: string }>;
  elapsedMs: number;
}

export async function search(req: SearchRequest): Promise<SearchResponse> {
  const t0 = Date.now();

  const radiusMeters = req.radiusKm * 1000;
  const clubs = await findClubsInRadius(req.lat, req.lng, radiusMeters);

  const dateKey = req.date.toISOString().slice(0, 10);

  const settled = await Promise.allSettled(
    clubs.map(async (club) => {
      const cacheKey = `slots:${club.id}:${dateKey}:${req.durationMinutes}`;
      const slots = await cached(cacheKey, defaultTtl(), async () => {
        const adapter = getAdapter(club.provider);
        return adapter.getAvailability({ club, date: req.date, durationMinutes: req.durationMinutes });
      });
      return { club, slots };
    }),
  );

  const results: ClubResult[] = [];
  const errors: SearchResponse["errors"] = [];

  for (let i = 0; i < settled.length; i++) {
    const club = clubs[i];
    if (!club) continue;
    const outcome = settled[i];
    if (!outcome) continue;

    if (outcome.status === "fulfilled") {
      const filtered = filterByHourWindow(outcome.value.slots, req.startHour, req.endHour);
      results.push({ club, slots: filtered });
    } else {
      const err = outcome.reason;
      const message =
        err instanceof AdapterError ? err.message : err instanceof Error ? err.message : String(err);
      results.push({ club, slots: [], error: message });
      errors.push({ clubSlug: club.slug, provider: club.provider, message });
    }
  }

  results.sort((a, b) => {
    const minA = earliestSlotTime(a.slots);
    const minB = earliestSlotTime(b.slots);
    if (minA !== minB) return minA - minB;
    return a.club.distanceMeters - b.club.distanceMeters;
  });

  return {
    query: {
      lat: req.lat,
      lng: req.lng,
      radiusKm: req.radiusKm,
      date: dateKey,
      durationMinutes: req.durationMinutes,
      startHour: req.startHour,
      endHour: req.endHour,
    },
    totalClubs: results.length,
    totalSlots: results.reduce((acc, r) => acc + r.slots.length, 0),
    results,
    errors,
    elapsedMs: Date.now() - t0,
  };
}

function filterByHourWindow(slots: Slot[], startHour?: number, endHour?: number): Slot[] {
  if (startHour === undefined && endHour === undefined) return slots;
  return slots.filter((s) => {
    const h = s.startTime.getHours();
    if (startHour !== undefined && h < startHour) return false;
    if (endHour !== undefined && h >= endHour) return false;
    return true;
  });
}

function earliestSlotTime(slots: Slot[]): number {
  if (slots.length === 0) return Number.POSITIVE_INFINITY;
  let min = Number.POSITIVE_INFINITY;
  for (const s of slots) {
    const t = s.startTime.getTime();
    if (t < min) min = t;
  }
  return min;
}
