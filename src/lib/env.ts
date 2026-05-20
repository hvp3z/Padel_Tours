import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url().optional(),
  ADAPTERS_MODE: z.enum(["mock", "live"]).default("mock"),
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(180),
  MAPBOX_TOKEN: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  DEFAULT_LAT: z.coerce.number().default(47.39414),
  DEFAULT_LNG: z.coerce.number().default(0.68484),
});

export const env = schema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  ADAPTERS_MODE: process.env.ADAPTERS_MODE,
  CACHE_TTL_SECONDS: process.env.CACHE_TTL_SECONDS,
  MAPBOX_TOKEN: process.env.MAPBOX_TOKEN,
  SENTRY_DSN: process.env.SENTRY_DSN,
  DEFAULT_LAT: process.env.DEFAULT_LAT,
  DEFAULT_LNG: process.env.DEFAULT_LNG,
});

export type Env = typeof env;
