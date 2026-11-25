import { geocode } from "@/lib/geo/geocode";

const cache = new Map<string, number>();
const CACHE_MAX = 20_000;

// The GeoNames id of the first city a job's location names, 0 for none; `places` (job-places.ts) settles shared names.
export function jobCity(location: string, places: string): number {
  const key = `${places}\u0000${location}`;
  const known = cache.get(key);
  if (known !== undefined) return known;
  const countries = places.split(" ").filter((token) => /^[A-Z]{2}$/.test(token));
  const id = geocode(location, countries)?.id ?? 0;
  if (cache.size >= CACHE_MAX) cache.clear();
  cache.set(key, id);
  return id;
}
