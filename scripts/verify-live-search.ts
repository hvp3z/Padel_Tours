import { search } from "../src/lib/search";

async function main() {
  const result = await search({
    lat: 47.39,
    lng: 0.69,
    radiusKm: 30,
    date: new Date("2026-06-05T00:00:00"),
    durationMinutes: 90,
  });

  console.log("totalClubs:", result.totalClubs);
  console.log("totalSlots:", result.totalSlots);
  console.log("errors:", JSON.stringify(result.errors));

  for (const r of result.results) {
    console.log("---", r.club.slug, r.club.provider, "slots:", r.slots.length, r.error ?? "");
    if (r.slots[0]) {
      const s = r.slots[0];
      console.log("  sample:", s.courtName, s.startTime.toISOString(), s.priceEur, "EUR");
    }
  }

  console.log("elapsedMs:", result.elapsedMs);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
