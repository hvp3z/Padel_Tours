import { describe, expect, it } from "vitest";
import { parseDoinsport, type DoinsportPlanningResponse } from "../src/lib/adapters/doinsport";
import type { Club } from "../src/lib/adapters/types";

const sampleClub: Club = {
  id: "test-id",
  slug: "la-bulle-padel",
  name: "La Bulle Padel Club",
  address: "Allée de la Touche",
  postalCode: "37390",
  city: "Charentilly",
  lat: 47.46574,
  lng: 0.62334,
  courtsCount: 3,
  provider: "doinsport",
  externalId: "502bef2a-4862-4f00-9caf-15dd917df633",
  bookingBaseUrl: "https://labullepadelclub.doinsport.club",
};

const planningFixture: DoinsportPlanningResponse = {
  "hydra:member": [
    {
      id: "406602b0-9abd-4f65-b16b-68acfadba2d9",
      name: "Padel 1",
      indoor: true,
      activities: [
        {
          id: "ce8c306e-224a-4f24-aa9d-6500580924dc",
          name: "Padel",
          slots: [
            {
              startAt: "16:00",
              prices: [
                {
                  duration: 3600,
                  pricePerParticipant: 600,
                  participantCount: 4,
                  bookable: true,
                },
                {
                  duration: 5400,
                  pricePerParticipant: 1050,
                  participantCount: 4,
                  bookable: true,
                },
              ],
            },
            {
              startAt: "19:00",
              prices: [
                {
                  duration: 5400,
                  pricePerParticipant: 1350,
                  participantCount: 4,
                  bookable: false,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

describe("parseDoinsport", () => {
  it("returns only bookable slots matching duration", () => {
    const slots90 = parseDoinsport(planningFixture, sampleClub, 90, "2026-06-05");
    expect(slots90).toHaveLength(1);
    expect(slots90[0]?.durationMinutes).toBe(90);
    expect(slots90[0]?.courtName).toBe("Padel 1");
    expect(slots90[0]?.surface).toBe("indoor");
  });

  it("computes total court price from per-participant cents", () => {
    const slots60 = parseDoinsport(planningFixture, sampleClub, 60, "2026-06-05");
    expect(slots60[0]?.priceEur).toBe(24);
  });

  it("converts local start time to UTC", () => {
    const slots90 = parseDoinsport(planningFixture, sampleClub, 90, "2026-06-05");
    expect(slots90[0]?.startTime.toISOString()).toBe("2026-06-05T14:00:00.000Z");
    expect(slots90[0]?.endTime.toISOString()).toBe("2026-06-05T15:30:00.000Z");
  });

  it("uses club booking URL", () => {
    const slots = parseDoinsport(planningFixture, sampleClub, 90, "2026-06-05");
    expect(slots[0]?.bookingUrl).toBe(sampleClub.bookingBaseUrl);
  });

  it("handles activities returned as an object", () => {
    const objectFixture: DoinsportPlanningResponse = {
      "hydra:member": [
        {
          id: "pg-2",
          name: "Padel 2",
          indoor: false,
          activities: {
            "1": {
              id: "ce8c306e-224a-4f24-aa9d-6500580924dc",
              name: "Padel",
              slots: [
                {
                  startAt: "10:00",
                  prices: [
                    {
                      duration: 5400,
                      pricePerParticipant: 750,
                      participantCount: 4,
                      bookable: true,
                    },
                  ],
                },
              ],
            },
          },
        },
      ],
    };

    const slots = parseDoinsport(objectFixture, sampleClub, 90, "2026-06-05");
    expect(slots).toHaveLength(1);
    expect(slots[0]?.courtName).toBe("Padel 2");
    expect(slots[0]?.surface).toBe("outdoor");
  });
});
