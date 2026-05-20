import { describe, expect, it } from "vitest";
import { MockAdapter } from "../src/lib/adapters/mock";
import type { Club } from "../src/lib/adapters/types";

const sampleClub: Club = {
  id: "test-id",
  slug: "test-club",
  name: "Test Club",
  address: "1 rue du test",
  postalCode: "37000",
  city: "Tours",
  lat: 47.39,
  lng: 0.68,
  courtsCount: 4,
  provider: "mock",
  externalId: "test",
  bookingBaseUrl: "https://example.com",
};

describe("MockAdapter", () => {
  it("returns deterministic slots for the same input", async () => {
    const adapter = new MockAdapter();
    const date = new Date("2026-06-01T00:00:00");

    const a = await adapter.getAvailability({ club: sampleClub, date, durationMinutes: 90 });
    const b = await adapter.getAvailability({ club: sampleClub, date, durationMinutes: 90 });

    expect(a.length).toBe(b.length);
    expect(a.map((s) => s.startTime.toISOString())).toEqual(b.map((s) => s.startTime.toISOString()));
  });

  it("respects the requested duration", async () => {
    const adapter = new MockAdapter();
    const date = new Date("2026-06-01T00:00:00");
    const slots = await adapter.getAvailability({ club: sampleClub, date, durationMinutes: 60 });
    for (const s of slots) {
      expect(s.durationMinutes).toBe(60);
      expect(s.endTime.getTime() - s.startTime.getTime()).toBe(60 * 60_000);
    }
  });

  it("produces booking URLs that include club base url", async () => {
    const adapter = new MockAdapter();
    const date = new Date("2026-06-01T00:00:00");
    const slots = await adapter.getAvailability({ club: sampleClub, date, durationMinutes: 90 });
    for (const s of slots) {
      expect(s.bookingUrl).toContain(sampleClub.bookingBaseUrl);
    }
  });
});
