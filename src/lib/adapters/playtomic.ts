import { fromZonedTime } from "date-fns-tz";
import { AdapterError, type AvailabilityRequest, type Club, type ProviderAdapter, type Slot } from "./types";

const PLAYTOMIC_API = "https://api.playtomic.io/v1";
const DEFAULT_TIMEZONE = "Europe/Paris";

export interface PlaytomicResourceMeta {
  name: string;
  surface?: "indoor" | "outdoor";
}

export interface PlaytomicAvailabilityResponse {
  resource_id: string;
  start_date: string;
  slots: Array<{
    start_time: string;
    duration: number;
    price?: string;
  }>;
}

export interface PlaytomicTenantResponse {
  tenant_id: string;
  tenant_name: string;
  address?: { timezone?: string };
  resources?: Array<{
    resource_id: string;
    name: string;
    sport_id: string;
    properties?: { resource_type?: string };
  }>;
}

export function parsePlaytomicPrice(price?: string): number | undefined {
  if (!price) return undefined;
  const match = price.match(/([\d.,]+)/);
  if (!match) return undefined;
  return Number.parseFloat(match[1].replace(",", "."));
}

export function mapResourceSurface(resourceType?: string): "indoor" | "outdoor" | undefined {
  if (resourceType === "indoor" || resourceType === "outdoor") return resourceType;
  return undefined;
}

export function buildResourceMap(tenant: PlaytomicTenantResponse): Map<string, PlaytomicResourceMeta> {
  const map = new Map<string, PlaytomicResourceMeta>();
  for (const resource of tenant.resources ?? []) {
    map.set(resource.resource_id, {
      name: resource.name,
      surface: mapResourceSurface(resource.properties?.resource_type),
    });
  }
  return map;
}

export function formatPlaytomicLocalDay(date: Date): { min: string; max: string } {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const day = `${y}-${m}-${d}`;
  return { min: `${day}T00:00:00`, max: `${day}T23:59:59` };
}

export function parsePlaytomic(
  data: PlaytomicAvailabilityResponse[],
  club: Club,
  requestedDuration: number,
  resourceMap: Map<string, PlaytomicResourceMeta>,
  timezone = DEFAULT_TIMEZONE,
): Slot[] {
  const slots: Slot[] = [];

  for (const resource of data) {
    const meta = resourceMap.get(resource.resource_id);
    const courtName = meta?.name ?? `Court ${resource.resource_id.slice(0, 8)}`;

    for (const slot of resource.slots) {
      if (slot.duration !== requestedDuration) continue;

      const localStart = `${resource.start_date}T${slot.start_time}`;
      const startTime = fromZonedTime(localStart, timezone);
      const endTime = new Date(startTime.getTime() + slot.duration * 60_000);

      slots.push({
        startTime,
        endTime,
        durationMinutes: slot.duration,
        courtName,
        surface: meta?.surface,
        priceEur: parsePlaytomicPrice(slot.price),
        bookingUrl: club.bookingBaseUrl,
      });
    }
  }

  return slots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

export class PlaytomicAdapter implements ProviderAdapter {
  readonly name = "playtomic" as const;

  async getAvailability(req: AvailabilityRequest): Promise<Slot[]> {
    const { club, date, durationMinutes } = req;

    try {
      const tenant = await fetchTenant(club.externalId);
      const timezone = tenant.address?.timezone ?? DEFAULT_TIMEZONE;
      const resourceMap = buildResourceMap(tenant);
      const { min, max } = formatPlaytomicLocalDay(date);

      const url = new URL(`${PLAYTOMIC_API}/availability`);
      url.searchParams.set("user_id", "me");
      url.searchParams.set("tenant_id", club.externalId);
      url.searchParams.set("sport_id", "PADEL");
      url.searchParams.set("local_start_min", min);
      url.searchParams.set("local_start_max", max);

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
      return parsePlaytomic(data, club, durationMinutes, resourceMap, timezone);
    } catch (err) {
      if (err instanceof AdapterError) throw err;
      throw new AdapterError(this.name, club.slug, "fetch failed", err);
    }
  }

  async healthcheck() {
    const start = Date.now();
    try {
      const url = new URL(`${PLAYTOMIC_API}/tenants`);
      url.searchParams.set("coordinate", "47.39,0.69");
      url.searchParams.set("radius", "10000");
      url.searchParams.set("sport_id", "PADEL");
      url.searchParams.set("size", "1");

      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      });
      return { ok: res.ok, latencyMs: Date.now() - start };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - start, error: String(err) };
    }
  }
}

async function fetchTenant(tenantId: string): Promise<PlaytomicTenantResponse> {
  const res = await fetch(`${PLAYTOMIC_API}/tenants/${tenantId}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "padel-tours-aggregator/0.1 (+contact)",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new AdapterError("playtomic", tenantId, `tenant HTTP ${res.status}`);
  }

  return (await res.json()) as PlaytomicTenantResponse;
}
