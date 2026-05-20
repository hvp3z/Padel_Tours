import { AdapterError, type AvailabilityRequest, type ProviderAdapter, type Slot } from "./types";

/**
 * Doinsport adapter.
 *
 * STATUT: STUB — à compléter en phase 1.
 *
 * Reverse-engineering :
 * - Doinsport sert généralement le booking sous des sous-domaines `*.doinsport.club`
 * - L'API publique est sous `api.doinsport.com` ou `app.doinsport.com/api`
 * - Endpoint probable : GET /api/clubs/{externalId}/activities/{activityId}/playgrounds/availabilities?date={YYYY-MM-DD}
 * - Une clé d'API (X-Api-Key) ou un cookie de session peut être requis. Beaucoup de clubs ont un widget JS public qui contient un token "client" non-secret.
 */
export class DoinsportAdapter implements ProviderAdapter {
  readonly name = "doinsport" as const;

  private readonly baseUrl = "https://app.doinsport.com/api";

  async getAvailability(req: AvailabilityRequest): Promise<Slot[]> {
    const { club, date, durationMinutes } = req;
    try {
      const dateStr = date.toISOString().slice(0, 10);
      const url = `${this.baseUrl}/clubs/${club.externalId}/playgrounds/availabilities?date=${dateStr}&duration=${durationMinutes}`;

      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "padel-tours-aggregator/0.1 (+contact)",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) throw new AdapterError(this.name, club.slug, `HTTP ${res.status}`);
      const data = (await res.json()) as DoinsportResponse;
      return parseDoinsport(data, club, durationMinutes);
    } catch (err) {
      if (err instanceof AdapterError) throw err;
      throw new AdapterError(this.name, club.slug, "fetch failed", err);
    }
  }

  async healthcheck() {
    const start = Date.now();
    try {
      const res = await fetch(this.baseUrl, { signal: AbortSignal.timeout(5000) });
      return { ok: res.ok || res.status === 404, latencyMs: Date.now() - start };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - start, error: String(err) };
    }
  }
}

interface DoinsportResponse {
  playgrounds: Array<{
    id: string;
    name: string;
    slots: Array<{
      start: string;
      end: string;
      duration: number;
      price?: { amount: number; currency: string };
      available: boolean;
    }>;
  }>;
}

function parseDoinsport(
  data: DoinsportResponse,
  club: import("./types").Club,
  requestedDuration: number,
): Slot[] {
  const slots: Slot[] = [];
  for (const pg of data.playgrounds) {
    for (const s of pg.slots) {
      if (!s.available || s.duration !== requestedDuration) continue;
      slots.push({
        startTime: new Date(s.start),
        endTime: new Date(s.end),
        durationMinutes: s.duration,
        courtName: pg.name,
        priceEur: s.price ? s.price.amount / 100 : undefined,
        bookingUrl: `${club.bookingBaseUrl}?date=${s.start.slice(0, 10)}&time=${s.start.slice(11, 16)}&pg=${pg.id}`,
      });
    }
  }
  return slots;
}
