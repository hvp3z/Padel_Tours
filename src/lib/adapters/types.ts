export type ProviderName = "playtomic" | "doinsport" | "anybuddy" | "tenup" | "custom" | "mock";

export interface Club {
  id: string;
  slug: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  lat: number;
  lng: number;
  courtsCount: number;
  provider: ProviderName;
  externalId: string;
  bookingBaseUrl: string;
  notes?: string;
}

export interface Slot {
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  courtName: string;
  surface?: "indoor" | "outdoor";
  priceEur?: number;
  bookingUrl: string;
}

export interface AvailabilityRequest {
  club: Club;
  date: Date;
  durationMinutes: number;
}

export interface ProviderAdapter {
  readonly name: ProviderName;
  getAvailability(req: AvailabilityRequest): Promise<Slot[]>;
  healthcheck?(): Promise<{ ok: boolean; latencyMs: number; error?: string }>;
}

export class AdapterError extends Error {
  constructor(
    public readonly provider: ProviderName,
    public readonly clubSlug: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`[${provider}/${clubSlug}] ${message}`);
    this.name = "AdapterError";
  }
}
