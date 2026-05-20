import { NextResponse } from "next/server";
import { z } from "zod";
import { search } from "@/lib/search";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().int().positive().max(50).default(15),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
    .default(() => new Date().toISOString().slice(0, 10)),
  durationMinutes: z.coerce.number().int().refine((n) => [60, 90, 120].includes(n), {
    message: "durationMinutes must be one of 60, 90, 120",
  }).default(90),
  startHour: z.coerce.number().int().min(0).max(23).optional(),
  endHour: z.coerce.number().int().min(1).max(24).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const parsed = querySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid query", issues: parsed.error.issues }, { status: 400 });
  }

  const q = parsed.data;
  const date = new Date(`${q.date}T00:00:00`);

  try {
    const result = await search({
      lat: q.lat,
      lng: q.lng,
      radiusKm: q.radiusKm,
      date,
      durationMinutes: q.durationMinutes,
      startHour: q.startHour,
      endHour: q.endHour,
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
