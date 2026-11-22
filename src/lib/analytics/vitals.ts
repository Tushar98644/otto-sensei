import { trackVitals } from "./client";

const SAMPLE_RATE = 0.2;

type Metric = { name: string; value: number };

let started = false;

// A sample of page loads, for the page they landed on; the library loads only for those, once idle.
export function startVitals(route: string, sample = Math.random()): void {
  if (started || sample >= SAMPLE_RATE) return;
  started = true;
  const metrics: Record<string, number> = {};
  const keep = ({ name, value }: Metric) => {
    metrics[name] = name === "CLS" ? Math.round(value * 1000) / 1000 : Math.round(value);
  };
  const sendOnce = () => {
    if (document.visibilityState !== "hidden" || Object.keys(metrics).length === 0) return;
    document.removeEventListener("visibilitychange", sendOnce);
    trackVitals(route, metrics);
  };
  const load = () =>
    import("web-vitals")
      .then(({ onCLS, onINP, onLCP, onTTFB }) => {
        onLCP(keep);
        onINP(keep);
        onCLS(keep);
        onTTFB(keep);
        // After the library's own listeners, which settle CLS and INP as the page hides.
        document.addEventListener("visibilitychange", sendOnce);
      })
      .catch(() => {});
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(load, { timeout: 4_000 });
  } else {
    window.setTimeout(load, 1_500);
  }
}

export function resetVitalsForTests(): void {
  started = false;
}
