import type { ProviderAdapter, Slot, AvailabilityRequest } from "./types";

/**
 * MockAdapter generates deterministic fake availability for development.
 * Used when ADAPTERS_MODE=mock. Lets the entire pipeline (search API, UI, cache)
 * be validated end-to-end without hitting any real provider.
 */
export class MockAdapter implements ProviderAdapter {
  readonly name = "mock" as const;

  async getAvailability(req: AvailabilityRequest): Promise<Slot[]> {
    const { club, date, durationMinutes } = req;

    const seed = hashString(`${club.id}-${date.toDateString()}`);
    const rng = mulberry32(seed);

    const slots: Slot[] = [];
    const dayStart = new Date(date);
    dayStart.setHours(8, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(22, 0, 0, 0);

    const stepMin = 30;
    for (let t = dayStart.getTime(); t + durationMinutes * 60_000 <= dayEnd.getTime(); t += stepMin * 60_000) {
      if (rng() < 0.35) {
        const courtIdx = Math.floor(rng() * Math.max(1, club.courtsCount));
        const start = new Date(t);
        const end = new Date(t + durationMinutes * 60_000);
        slots.push({
          startTime: start,
          endTime: end,
          durationMinutes,
          courtName: `Court ${courtIdx + 1}`,
          surface: rng() < 0.5 ? "indoor" : "outdoor",
          priceEur: 16 + Math.round(rng() * 18),
          bookingUrl: `${club.bookingBaseUrl}?date=${start.toISOString().slice(0, 10)}&time=${start.toISOString().slice(11, 16)}`,
        });
      }
    }

    return slots;
  }

  async healthcheck() {
    return { ok: true, latencyMs: 1 };
  }
}

function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
