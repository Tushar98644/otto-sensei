// bun scripts/geo-cities.ts --in <folder>/cities15000.txt (unzipped from GeoNames; docs/third-party-notices.md, "City data").
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "src/lib/geo/cities.json");

function flag(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const clean = (value: string) => value.replace(/[|\n\r\t]/g, " ").trim();

type City = {
  id: number;
  name: string;
  ascii: string;
  country: string;
  admin: string;
  lat: number;
  lng: number;
  pop: number;
};

const cities: City[] = [];
for (const line of readFileSync(flag("--in"), "utf8").split("\n")) {
  const cols = line.split("\t");
  if (cols.length < 15) continue;
  const id = Number(cols[0]);
  const lat = Number(cols[4]);
  const lng = Number(cols[5]);
  const country = cols[8] ?? "";
  if (!Number.isSafeInteger(id) || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
  if (!/^[A-Z]{2}$/.test(country)) continue;
  cities.push({
    id,
    name: clean(cols[1] ?? ""),
    ascii: clean(cols[2] ?? "") || clean(cols[1] ?? ""),
    country,
    admin: clean(cols[10] ?? ""),
    lat,
    lng,
    pop: Math.max(0, Math.round(Number(cols[14]) || 0)),
  });
}
// The most people first, so a name's first match is its biggest place.
cities.sort((a, b) => b.pop - a.pop || a.id - b.id);

const rows = cities.map((city) =>
  [
    city.id,
    city.name === city.ascii ? "" : city.name,
    city.ascii,
    city.country,
    city.admin,
    city.lat.toFixed(2),
    city.lng.toFixed(2),
    city.pop,
  ].join("|"),
);
const data = {
  source: "GeoNames cities15000, CC BY 4.0, https://www.geonames.org/",
  columns: "id|name|ascii|country|admin1|lat|lng|population",
  rows: rows.join("\n"),
};
writeFileSync(OUT, `${JSON.stringify(data)}\n`);
console.log(`${cities.length} cities, ${(JSON.stringify(data).length / 1024).toFixed(0)} KB`);
