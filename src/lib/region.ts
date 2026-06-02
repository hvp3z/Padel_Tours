/** Bounding box Centre-Val de Loire pour Nominatim (ouest, nord, est, sud). */
export const CENTRE_VAL_DE_LOIRE = {
  west: 0.05,
  north: 48.85,
  east: 3.15,
  south: 46.35,
} as const;

/** Paramètres Nominatim : résultats limités à la région. */
export function nominatimRegionParams(): string {
  const { west, north, east, south } = CENTRE_VAL_DE_LOIRE;
  return `viewbox=${west},${north},${east},${south}&bounded=1`;
}

export function isInCentreValDeLoire(lat: number, lng: number): boolean {
  const { west, north, east, south } = CENTRE_VAL_DE_LOIRE;
  return lat >= south && lat <= north && lng >= west && lng <= east;
}
