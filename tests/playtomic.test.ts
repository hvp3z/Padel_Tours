import { describe, expect, it } from "vitest";
import {
  buildResourceMap,
  parsePlaytomic,
  parsePlaytomicPrice,
  type PlaytomicAvailabilityResponse,
  type PlaytomicTenantResponse,
} from "../src/lib/adapters/playtomic";
import type { Club } from "../src/lib/adapters/types";

const sampleClub: Club = {
  id: "test-id",
  slug: "padelshot-st-pierre-des-corps",
  name: "PadelShot Tours - St Pierre des Corps",
  address: "10 rue de la Brétèche",
  postalCode: "37700",
  city: "Saint-Pierre-des-Corps",
  lat: 47.38082,
  lng: 0.72747,
  courtsCount: 4,
  provider: "playtomic",
  externalId: "f9a2e26c-3eed-4692-9137-d1f38d31050e",
  bookingBaseUrl: "https://playtomic.com/clubs/padelshot-st-pierre-des-corps",
};

const tenantFixture: PlaytomicTenantResponse = {
  tenant_id: "f9a2e26c-3eed-4692-9137-d1f38d31050e",
  tenant_name: "PadelShot Tours - St Pierre des Corps",
  address: { timezone: "Europe/Paris" },
  resources: [
    {
      resource_id: "f8d6785b-81cc-4628-a16e-9ddfa24f438b",
      name: "Padel CDR x Chape&Co",
      sport_id: "PADEL",
      properties: { resource_type: "indoor" },
    },
    {
      resource_id: "cc9cf1e9-6994-418b-b8a0-cb88b7b6b44e",
      name: "Padel 2 Saint-Pierre-Des-Corps",
      sport_id: "PADEL",
      properties: { resource_type: "indoor" },
    },
  ],
};

const availabilityFixture: PlaytomicAvailabilityResponse[] = [
  {
    resource_id: "f8d6785b-81cc-4628-a16e-9ddfa24f438b",
    start_date: "2026-06-05",
    slots: [
      { start_time: "11:30:00", duration: 90, price: "54 EUR" },
      { start_time: "11:30:00", duration: 60, price: "36 EUR" },
      { start_time: "14:00:00", duration: 90, price: "54 EUR" },
    ],
  },
  {
    resource_id: "cc9cf1e9-6994-418b-b8a0-cb88b7b6b44e",
    start_date: "2026-06-05",
    slots: [{ start_time: "13:00:00", duration: 90, price: "54 EUR" }],
  },
];

describe("parsePlaytomicPrice", () => {
  it("parses EUR strings", () => {
    expect(parsePlaytomicPrice("54 EUR")).toBe(54);
    expect(parsePlaytomicPrice("72 EUR")).toBe(72);
  });
});

describe("parsePlaytomic", () => {
  const resourceMap = buildResourceMap(tenantFixture);

  it("maps court names and surfaces from tenant resources", () => {
    const slots = parsePlaytomic(availabilityFixture, sampleClub, 90, resourceMap);
    expect(slots.some((s) => s.courtName === "Padel CDR x Chape&Co")).toBe(true);
    expect(slots.every((s) => s.surface === "indoor")).toBe(true);
  });

  it("filters by requested duration", () => {
    const slots = parsePlaytomic(availabilityFixture, sampleClub, 90, resourceMap);
    expect(slots.every((s) => s.durationMinutes === 90)).toBe(true);
    expect(slots).toHaveLength(3);
  });

  it("parses prices and booking URLs", () => {
    const slots = parsePlaytomic(availabilityFixture, sampleClub, 90, resourceMap);
    expect(slots[0]?.priceEur).toBe(54);
    expect(slots[0]?.bookingUrl).toBe(sampleClub.bookingBaseUrl);
  });

  it("converts local Paris time to UTC Date", () => {
    const slots = parsePlaytomic(availabilityFixture, sampleClub, 90, resourceMap);
    const slot = slots.find((s) => s.courtName === "Padel CDR x Chape&Co" && s.startTime.getUTCHours() === 9);
    expect(slot).toBeDefined();
    expect(slot!.startTime.toISOString()).toBe("2026-06-05T09:30:00.000Z");
    expect(slot!.endTime.toISOString()).toBe("2026-06-05T11:00:00.000Z");
  });
});
