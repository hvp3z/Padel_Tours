import { fromZonedTime } from "date-fns-tz";
import { AdapterError, type AvailabilityRequest, type Club, type ProviderAdapter, type Slot } from "./types";

const DOINSPORT_API = "https://api-v3.doinsport.club";
const PADEL_ACTIVITY_ID = "ce8c306e-224a-4f24-aa9d-6500580924dc";
const DEFAULT_TIMEZONE = "Europe/Paris";

export interface DoinsportPlanningResponse {
  "hydra:member": DoinsportPlayground[];
}

export interface DoinsportPlayground {
  id: string;
  name: string;
  indoor: boolean;
  activities: DoinsportActivity[] | Record<string, DoinsportActivity>;
}

export interface DoinsportActivity {
  id: string;
  name: string;
  slots: DoinsportSlot[];
}

export interface DoinsportSlot {
  startAt: string;
  prices: Array<{
    duration: number;
    pricePerParticipant: number;
    participantCount: number;
    bookable: boolean;
  }>;
}

export function formatDoinsportDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function normalizeDoinsportActivities(
  activities: DoinsportPlayground["activities"] | undefined,
): DoinsportActivity[] {
  if (!activities) return [];
  if (Array.isArray(activities)) return activities;
  return Object.values(activities);
}
export function doinsportOriginFromClub(club: Club): string {
  try {
    return new URL(club.bookingBaseUrl).origin;
  } catch {
    return "https://labullepadelclub.doinsport.club";
  }
}

export function parseDoinsport(
  data: DoinsportPlanningResponse,
  club: Club,
  requestedDurationMinutes: number,
  dateStr: string,
  timezone = DEFAULT_TIMEZONE,
): Slot[] {
  const requestedDurationSeconds = requestedDurationMinutes * 60;
  const slots: Slot[] = [];

  for (const playground of data["hydra:member"] ?? []) {
    const surface: "indoor" | "outdoor" = playground.indoor ? "indoor" : "outdoor";

    for (const activity of normalizeDoinsportActivities(playground.activities)) {
      if (activity.id !== PADEL_ACTIVITY_ID && activity.name.toLowerCase() !== "padel") continue;

      for (const slot of activity.slots ?? []) {
        const matchingPrices = slot.prices.filter(
          (p) => p.duration === requestedDurationSeconds && p.bookable,
        );
        if (matchingPrices.length === 0) continue;

        const price = matchingPrices[0]!;
        const startTime = fromZonedTime(`${dateStr}T${slot.startAt}:00`, timezone);
        const endTime = new Date(startTime.getTime() + requestedDurationMinutes * 60_000);
        const totalPriceEur = (price.pricePerParticipant * price.participantCount) / 100;

        slots.push({
          startTime,
          endTime,
          durationMinutes: requestedDurationMinutes,
          courtName: playground.name,
          surface,
          priceEur: totalPriceEur,
          bookingUrl: club.bookingBaseUrl,
        });
      }
    }
  }

  return slots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

export class DoinsportAdapter implements ProviderAdapter {
  readonly name = "doinsport" as const;

  async getAvailability(req: AvailabilityRequest): Promise<Slot[]> {
    const { club, date, durationMinutes } = req;

    try {
      const dateStr = formatDoinsportDate(date);
      const url = new URL(`${DOINSPORT_API}/clubs/playgrounds/plannings/${dateStr}`);
      url.searchParams.set("club.id", club.externalId);
      url.searchParams.set("from", "08:00");
      url.searchParams.set("to", "23:00");
      url.searchParams.set("activities.id", PADEL_ACTIVITY_ID);

      const res = await fetch(url.toString(), {
        headers: {
          Accept: "application/ld+json",
          Origin: doinsportOriginFromClub(club),
          "User-Agent": "padel-tours-aggregator/0.1 (+contact)",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        throw new AdapterError(this.name, club.slug, `HTTP ${res.status}`);
      }

      const data = (await res.json()) as DoinsportPlanningResponse;
      return parseDoinsport(data, club, durationMinutes, dateStr);
    } catch (err) {
      if (err instanceof AdapterError) throw err;
      throw new AdapterError(this.name, club.slug, "fetch failed", err);
    }
  }

  async healthcheck() {
    const start = Date.now();
    try {
      const res = await fetch(`${DOINSPORT_API}/clubs/white-labels/9ead8682-e7c8-4f3d-a1a7-55df9fd16462`, {
        headers: { Accept: "application/ld+json" },
        signal: AbortSignal.timeout(5000),
      });
      return { ok: res.ok, latencyMs: Date.now() - start };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - start, error: String(err) };
    }
  }
}
