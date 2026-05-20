import { AdapterError, type AvailabilityRequest, type ProviderAdapter, type Slot } from "./types";

/**
 * Anybuddy adapter.
 *
 * STATUT: STUB — à compléter en phase 1.
 *
 * Anybuddy est un concurrent direct du produit qu'on construit.
 * Leur API mobile communique avec `api.anybuddyapp.com`.
 * Endpoint probable : POST /v2/search/availability avec body { centerId, date, duration, sport: "padel" }
 *
 * Attention CGU : vérifier que le scraping est compatible avec leurs conditions.
 * En cas de doute, contacter le club directement ou se rabattre sur son provider secondaire.
 */
export class AnybuddyAdapter implements ProviderAdapter {
  readonly name = "anybuddy" as const;

  private readonly baseUrl = "https://api.anybuddyapp.com/v2";

  async getAvailability(req: AvailabilityRequest): Promise<Slot[]> {
    const { club, date, durationMinutes } = req;
    try {
      const res = await fetch(`${this.baseUrl}/search/availability`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "padel-tours-aggregator/0.1 (+contact)",
        },
        body: JSON.stringify({
          centerId: club.externalId,
          date: date.toISOString().slice(0, 10),
          duration: durationMinutes,
          sport: "padel",
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) throw new AdapterError(this.name, club.slug, `HTTP ${res.status}`);
      const data = (await res.json()) as AnybuddyResponse;
      return parseAnybuddy(data, club, durationMinutes);
    } catch (err) {
      if (err instanceof AdapterError) throw err;
      throw new AdapterError(this.name, club.slug, "fetch failed", err);
    }
  }

  async healthcheck() {
    const start = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(5000) });
      return { ok: res.ok, latencyMs: Date.now() - start };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - start, error: String(err) };
    }
  }
}

interface AnybuddyResponse {
  results: Array<{
    courtId: string;
    courtName: string;
    surface?: "indoor" | "outdoor";
    timeslots: Array<{
      startsAt: string;
      endsAt: string;
      price: number;
    }>;
  }>;
}

function parseAnybuddy(
  data: AnybuddyResponse,
  club: import("./types").Club,
  durationMinutes: number,
): Slot[] {
  const slots: Slot[] = [];
  for (const r of data.results) {
    for (const ts of r.timeslots) {
      slots.push({
        startTime: new Date(ts.startsAt),
        endTime: new Date(ts.endsAt),
        durationMinutes,
        courtName: r.courtName,
        surface: r.surface,
        priceEur: ts.price,
        bookingUrl: `${club.bookingBaseUrl}?court=${r.courtId}&start=${ts.startsAt}`,
      });
    }
  }
  return slots;
}
