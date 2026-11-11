// A small table of cities people put on resumes, matched by name. No lookup service, so an unknown
// city gets no pin and the owner can still pick a time zone.

export type Place = { city: string; timezone: string; lat: number; lng: number };

// [names (first is the display name), IANA zone, lat, lng]
const CITIES: readonly [string[], string, number, number][] = [
  [["Lisbon", "Lisboa"], "Europe/Lisbon", 38.72, -9.14],
  [["Porto"], "Europe/Lisbon", 41.15, -8.61],
  [["London"], "Europe/London", 51.51, -0.13],
  [["Manchester"], "Europe/London", 53.48, -2.24],
  [["Edinburgh"], "Europe/London", 55.95, -3.19],
  [["Dublin"], "Europe/Dublin", 53.35, -6.26],
  [["Paris"], "Europe/Paris", 48.86, 2.35],
  [["Berlin"], "Europe/Berlin", 52.52, 13.4],
  [["Munich", "München"], "Europe/Berlin", 48.14, 11.58],
  [["Hamburg"], "Europe/Berlin", 53.55, 9.99],
  [["Amsterdam"], "Europe/Amsterdam", 52.37, 4.9],
  [["Brussels"], "Europe/Brussels", 50.85, 4.35],
  [["Madrid"], "Europe/Madrid", 40.42, -3.7],
  [["Barcelona"], "Europe/Madrid", 41.39, 2.17],
  [["Milan", "Milano"], "Europe/Rome", 45.46, 9.19],
  [["Rome", "Roma"], "Europe/Rome", 41.9, 12.5],
  [["Zurich", "Zürich"], "Europe/Zurich", 47.38, 8.54],
  [["Vienna", "Wien"], "Europe/Vienna", 48.21, 16.37],
  [["Prague", "Praha"], "Europe/Prague", 50.08, 14.44],
  [["Warsaw", "Warszawa"], "Europe/Warsaw", 52.23, 21.01],
  [["Wrocław", "Wroclaw"], "Europe/Warsaw", 51.11, 17.04],
  [["Kraków", "Krakow"], "Europe/Warsaw", 50.06, 19.94],
  [["Stockholm"], "Europe/Stockholm", 59.33, 18.07],
  [["Copenhagen", "København"], "Europe/Copenhagen", 55.68, 12.57],
  [["Oslo"], "Europe/Oslo", 59.91, 10.75],
  [["Helsinki"], "Europe/Helsinki", 60.17, 24.94],
  [["Tallinn"], "Europe/Tallinn", 59.44, 24.75],
  [["Athens"], "Europe/Athens", 37.98, 23.73],
  [["Istanbul"], "Europe/Istanbul", 41.01, 28.98],
  [["Kyiv", "Kiev"], "Europe/Kyiv", 50.45, 30.52],
  [["Bucharest"], "Europe/Bucharest", 44.43, 26.1],
  [["Budapest"], "Europe/Budapest", 47.5, 19.04],
  [["Tel Aviv"], "Asia/Jerusalem", 32.09, 34.78],
  [["Dubai"], "Asia/Dubai", 25.2, 55.27],
  [["Cairo"], "Africa/Cairo", 30.04, 31.24],
  [["Lagos"], "Africa/Lagos", 6.52, 3.38],
  [["Nairobi"], "Africa/Nairobi", -1.29, 36.82],
  [["Cape Town"], "Africa/Johannesburg", -33.92, 18.42],
  [["Johannesburg"], "Africa/Johannesburg", -26.2, 28.05],
  [["Bengaluru", "Bangalore"], "Asia/Kolkata", 12.97, 77.59],
  [["Mumbai", "Bombay"], "Asia/Kolkata", 19.08, 72.88],
  [["Delhi", "New Delhi"], "Asia/Kolkata", 28.61, 77.21],
  [["Gurugram", "Gurgaon"], "Asia/Kolkata", 28.46, 77.03],
  [["Noida"], "Asia/Kolkata", 28.54, 77.39],
  [["Hyderabad"], "Asia/Kolkata", 17.39, 78.49],
  [["Pune"], "Asia/Kolkata", 18.52, 73.86],
  [["Chennai"], "Asia/Kolkata", 13.08, 80.27],
  [["Kolkata"], "Asia/Kolkata", 22.57, 88.36],
  [["Guwahati"], "Asia/Kolkata", 26.14, 91.74],
  [["Karachi"], "Asia/Karachi", 24.86, 67.0],
  [["Lahore"], "Asia/Karachi", 31.55, 74.34],
  [["Dhaka"], "Asia/Dhaka", 23.81, 90.41],
  [["Colombo"], "Asia/Colombo", 6.93, 79.86],
  [["Singapore"], "Asia/Singapore", 1.35, 103.82],
  [["Kuala Lumpur"], "Asia/Kuala_Lumpur", 3.14, 101.69],
  [["Jakarta"], "Asia/Jakarta", -6.21, 106.85],
  [["Bangkok"], "Asia/Bangkok", 13.76, 100.5],
  [["Ho Chi Minh City", "Saigon"], "Asia/Ho_Chi_Minh", 10.82, 106.63],
  [["Manila"], "Asia/Manila", 14.6, 120.98],
  [["Hong Kong"], "Asia/Hong_Kong", 22.32, 114.17],
  [["Shanghai"], "Asia/Shanghai", 31.23, 121.47],
  [["Beijing"], "Asia/Shanghai", 39.9, 116.41],
  [["Shenzhen"], "Asia/Shanghai", 22.54, 114.06],
  [["Taipei"], "Asia/Taipei", 25.03, 121.57],
  [["Seoul"], "Asia/Seoul", 37.57, 126.98],
  [["Tokyo"], "Asia/Tokyo", 35.68, 139.69],
  [["Osaka"], "Asia/Tokyo", 34.69, 135.5],
  [["Sydney"], "Australia/Sydney", -33.87, 151.21],
  [["Melbourne"], "Australia/Melbourne", -37.81, 144.96],
  [["Brisbane"], "Australia/Brisbane", -27.47, 153.03],
  [["Perth"], "Australia/Perth", -31.95, 115.86],
  [["Auckland"], "Pacific/Auckland", -36.85, 174.76],
  [["Toronto"], "America/Toronto", 43.65, -79.38],
  [["Montreal", "Montréal"], "America/Toronto", 45.5, -73.57],
  [["Vancouver"], "America/Vancouver", 49.28, -123.12],
  [["New York", "NYC", "Brooklyn"], "America/New_York", 40.71, -74.01],
  [["Boston"], "America/New_York", 42.36, -71.06],
  [["Washington", "Washington DC"], "America/New_York", 38.91, -77.04],
  [["Atlanta"], "America/New_York", 33.75, -84.39],
  [["Miami"], "America/New_York", 25.76, -80.19],
  [["Chicago"], "America/Chicago", 41.88, -87.63],
  [["Austin"], "America/Chicago", 30.27, -97.74],
  [["Dallas"], "America/Chicago", 32.78, -96.8],
  [["Denver"], "America/Denver", 39.74, -104.99],
  [["Seattle"], "America/Los_Angeles", 47.61, -122.33],
  [["Portland"], "America/Los_Angeles", 45.52, -122.68],
  [["San Francisco", "SF"], "America/Los_Angeles", 37.77, -122.42],
  [["Oakland"], "America/Los_Angeles", 37.8, -122.27],
  [["San Jose"], "America/Los_Angeles", 37.34, -121.89],
  [["Palo Alto"], "America/Los_Angeles", 37.44, -122.14],
  [["Los Angeles", "LA"], "America/Los_Angeles", 34.05, -118.24],
  [["San Diego"], "America/Los_Angeles", 32.72, -117.16],
  [["Mexico City", "CDMX"], "America/Mexico_City", 19.43, -99.13],
  [["São Paulo", "Sao Paulo"], "America/Sao_Paulo", -23.55, -46.63],
  [["Rio de Janeiro"], "America/Sao_Paulo", -22.91, -43.17],
  [["Buenos Aires"], "America/Argentina/Buenos_Aires", -34.6, -58.38],
  [["Bogotá", "Bogota"], "America/Bogota", 4.71, -74.07],
  [["Santiago"], "America/Santiago", -33.45, -70.67],
  [["Lima"], "America/Lima", -12.05, -77.04],
];

const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const word = (name: string, flags: string) =>
  new RegExp(`(?:^|[^\\p{L}])${escape(name)}(?:$|[^\\p{L}])`, flags);

const MATCHERS = CITIES.map(([names, timezone, lat, lng]) => ({
  place: { city: names[0]!, timezone, lat, lng },
  // Whole words only. Short aliases ("SF", "LA", "NYC") count only in capitals, the way people
  // write them, so "la" in "Villa la Angostura" or "Lagos" never matches.
  tests: names.map((name) =>
    name.length <= 3
      ? (raw: string) => word(name, "u").test(raw)
      : (raw: string) => word(fold(name), "u").test(fold(raw)),
  ),
}));

/** null for "Remote" and unknown towns. */
export function findPlace(location: string): Place | null {
  const value = location.trim();
  if (!value) return null;
  for (const { place, tests } of MATCHERS) {
    if (tests.some((test) => test(value))) return place;
  }
  return null;
}

export function isTimeZone(value: string): boolean {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
