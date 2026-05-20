import { AdapterError, type AvailabilityRequest, type ProviderAdapter, type Slot } from "./types";

/**
 * Playtomic adapter.
 *
 * STATUT: STUB — à compléter en phase 1 du plan après reverse-engineering.
 *
 * Reverse-engineering attendu :
 * 1. Ouvrir l'app web Playtomic dans Chrome + DevTools Network (filtre XHR/Fetch)
 * 2. Naviguer sur un club + une date
 * 3. Identifier l'endpoint de disponibilité. Probable :
 *    GET https://playtomic.io/api/v1/availability?tenant_id={externalId}&local_start_min={ISO}&local_start_max={ISO}&sport_id=PADEL
 * 4. Récupérer le format exact de la réponse (courts, slots, prix)
 * 5. Identifier les headers requis (X-Requested-With, User-Agent, peut-être un token public)
 * 6. Compléter `fetchAvailability` ci-dessous
 *
 * Le code ci-dessous est le squelette qu'il suffit de compléter.
 */
export class PlaytomicAdapter implements ProviderAdapter {
  readonly name = "playtomic" as const;

  private readonly baseUrl = "https://playtomic.io/api/v1";

  async getAvailability(req: AvailabilityRequest): Promise<Slot[]> {
    const { club, date, durationMinutes } = req;

    try {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const url = new URL(`${this.baseUrl}/availability`);
      url.searchParams.set("tenant_id", club.externalId);
      url.searchParams.set("local_start_min", dayStart.toISOString());
      url.searchParams.set("local_start_max", dayEnd.toISOString());
      url.searchParams.set("sport_id", "PADEL");

      const res = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "User-Agent": "padel-tours-aggregator/0.1 (+contact)",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        throw new AdapterError(this.name, club.slug, `HTTP ${res.status}`);
      }

      const data = (await res.json()) as PlaytomicAvailabilityResponse[];
      return parsePlaytomic(data, club, durationMinutes);
    } catch (err) {
      if (err instanceof AdapterError) throw err;
      throw new AdapterError(this.name, club.slug, "fetch failed", err);
    }
  }

  async healthcheck() {
    const start = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/tenants?size=1`, {
        signal: AbortSignal.timeout(5000),
      });
      return { ok: res.ok, latencyMs: Date.now() - start };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - start, error: String(err) };
    }
  }
}

interface PlaytomicAvailabilityResponse {
  resource_id: string;
  start_date: string;
  slots: Array<{
    start_time: string;
    duration: number;
    price?: string;
  }>;
}

function parsePlaytomic(
  data: PlaytomicAvailabilityResponse[],
  club: import("./types").Club,
  requestedDuration: number,
): Slot[] {
  const slots: Slot[] = [];
  for (const resource of data) {
    for (const slot of resource.slots) {
      if (slot.duration !== requestedDuration) continue;
      const start = new Date(`${resource.start_date}T${slot.start_time}`);
      const end = new Date(start.getTime() + slot.duration * 60_000);
      slots.push({
        startTime: start,
        endTime: end,
        durationMinutes: slot.duration,
        courtName: `Court ${resource.resource_id.slice(0, 6)}`,
        priceEur: slot.price ? Number.parseFloat(slot.price) : undefined,
        bookingUrl: `${club.bookingBaseUrl}?date=${resource.start_date}&time=${slot.start_time.slice(0, 5)}`,
      });
    }
  }
  return slots;
}
