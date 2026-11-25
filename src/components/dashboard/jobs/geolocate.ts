import { roundPoint, type Point } from "./filter-memory";

const TEN_MINUTES_MS = 10 * 60_000;
const WAIT_MS = 15_000;

// The browser's own location, rounded to about 1 km; it is never stored.
export function locate(): Promise<Point> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve(roundPoint({ lat: position.coords.latitude, lng: position.coords.longitude })),
      reject,
      { enableHighAccuracy: false, maximumAge: TEN_MINUTES_MS, timeout: WAIT_MS },
    );
  });
}
