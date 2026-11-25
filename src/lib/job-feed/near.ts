import { cityById, cityIdsNear } from "@/lib/geo/cities";
import type { JobFilters } from "./types";

// The cities a distance filter keeps, as GeoNames ids; null when none is asked, empty when its city is unknown.
export function nearCityIds(near: JobFilters["near"]): number[] | null {
  if (!near) return null;
  const point =
    near.city !== null
      ? cityById(near.city)
      : near.lat !== null && near.lng !== null
        ? { lat: near.lat, lng: near.lng }
        : null;
  return point ? cityIdsNear(point, near.km) : [];
}

// A point from the browser is never kept, so a list near one isn't cached either.
export const nearsPoint = (filters: JobFilters) =>
  filters.near !== null && filters.near.city === null;
