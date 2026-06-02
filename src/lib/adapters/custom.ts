import { type AvailabilityRequest, type ProviderAdapter, type Slot } from "./types";

/**
 * Custom adapter — pour les clubs avec leur propre back-office maison.
 *
 * STATUT: STUB. Stratégies par ordre de préférence :
 * 1. Trouver une URL JSON cachée (souvent les sites custom appellent leur propre API publique)
 * 2. Scraper le HTML rendu (cheerio si SSR) ou le HTML hydraté (playwright si SPA)
 * 3. Contacter le club et lui demander un flux iCal / CSV
 *
 * Pour chaque club custom, créer une variante de cette classe (CasaPadelToursAdapter, etc.)
 * ou parametrer cette classe via club.notes (URL, sélecteurs CSS, etc.)
 */
export class CustomAdapter implements ProviderAdapter {
  readonly name = "custom" as const;

  async getAvailability(_req: AvailabilityRequest): Promise<Slot[]> {
    return [];
  }

  async healthcheck() {
    return { ok: false, latencyMs: 0, error: "Pas d'endpoint global pour les adapters custom" };
  }
}
