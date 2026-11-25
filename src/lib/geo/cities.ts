import "server-only";
import data from "./cities.json";

// GeoNames' cities of 15,000 people or more (CC BY 4.0), the most people first (scripts/geo-cities.ts).
export type City = {
  id: number;
  name: string;
  ascii: string;
  country: string;
  admin: string;
  lat: number;
  lng: number;
  pop: number;
};

type Table = {
  list: City[];
  keys: string[];
  byId: Map<number, City>;
  byName: Map<string, City[]>;
};

let table: Table | null = null;

// Lowercase ASCII words, so "Zürich", "Zurich" and "ZURICH" read alike; "St." and "Saint" too.
export function cityKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bsaint\b/g, "st")
    .replace(/\bsainte\b/g, "ste")
    .trim();
}

function load(): Table {
  if (table) return table;
  const list: City[] = [];
  const keys: string[] = [];
  const byId = new Map<number, City>();
  const byName = new Map<string, City[]>();
  const add = (key: string, city: City) => {
    if (!key) return;
    const known = byName.get(key);
    if (!known) byName.set(key, [city]);
    else if (!known.includes(city)) known.push(city);
  };
  for (const row of data.rows.split("\n")) {
    const [id, name, ascii, country, admin, lat, lng, pop] = row.split("|");
    const city: City = {
      id: Number(id),
      name: name || ascii || "",
      ascii: ascii ?? "",
      country: country ?? "",
      admin: admin ?? "",
      lat: Number(lat),
      lng: Number(lng),
      pop: Number(pop),
    };
    const nameKey = cityKey(city.name);
    const asciiKey = cityKey(city.ascii);
    list.push(city);
    keys.push(nameKey === asciiKey ? nameKey : `${nameKey}|${asciiKey}`);
    byId.set(city.id, city);
    add(nameKey, city);
    add(asciiKey, city);
  }
  table = { list, keys, byId, byName };
  return table;
}

export const cityById = (id: number): City | null =>
  id > 0 ? (load().byId.get(id) ?? null) : null;

// Every city of that name, the most people first.
export const citiesNamed = (key: string): readonly City[] => load().byName.get(key) ?? [];

const EARTH_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// The ids of every city within `km` of a point, nearest first.
export function cityIdsNear(point: { lat: number; lng: number }, km: number): number[] {
  const latSpan = km / 111;
  const lngSpan = km / (111 * Math.max(0.05, Math.cos(rad(point.lat))));
  const near: [number, number][] = [];
  for (const city of load().list) {
    if (Math.abs(city.lat - point.lat) > latSpan) continue;
    const dLng = Math.abs(city.lng - point.lng);
    if (Math.min(dLng, 360 - dLng) > lngSpan) continue;
    const d = distanceKm(point, city);
    if (d <= km) near.push([d, city.id]);
  }
  return near.sort((a, b) => a[0] - b[0]).map(([, id]) => id);
}

// Cities whose name starts with the words typed, the most people first.
export function searchCities(query: string, limit: number): City[] {
  const key = cityKey(query);
  if (key.length < 2) return [];
  const { list, keys } = load();
  const found: City[] = [];
  for (let i = 0; i < list.length && found.length < limit; i++) {
    const names = keys[i] ?? "";
    if (names.startsWith(key) || names.includes(`|${key}`)) found.push(list[i]!);
  }
  return found;
}
