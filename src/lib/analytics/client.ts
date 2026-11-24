import { readJsonItem, removeItem, writeJsonItem } from "@/lib/browser-storage";
import type { Beacon, BeaconItem } from "./beacon";
import { posthogKey } from "./config";
import type { ClientEvent, ClientEventProps, EventArgs } from "./events";
import { dashboardSection, emailLanding, TRAFFIC_UTM_KEYS, withoutUtm } from "./landing";
import { trackingRefused } from "./privacy";

// No SDK: a small first-party beacon, which the server forwards to PostHog.

const ENDPOINT = "/api/activity";
const VISITOR_KEY = "otto:visitor";
const SESSION_IDLE_MS = 30 * 60_000;
const MAX_ITEMS = 20;

type Visitor = { id: string; linked: boolean; session: string; seenAt: number };
type OpenPage = { route: string; start: number; left: boolean };

let queue: BeaconItem[] = [];
let scheduled = false;
let listening = false;
let firstView = true;
let currentRoute = "/";
let openPage: OpenPage | null = null;
let watchingLeave = false;
// Kept here as well, so a browser that blocks storage still has one id for the whole visit.
let memory: Visitor | null = null;

export function analyticsEnabled(): boolean {
  if (typeof window === "undefined" || !posthogKey()) return false;
  const legacyDnt = (window as Window & { doNotTrack?: string | null }).doNotTrack;
  return !trackingRefused(window.navigator, legacyDnt);
}

// Time-ordered, as PostHog expects of session ids; random enough for a visitor id too.
function uuidv7(now: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let time = now;
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = time % 256;
    time = Math.floor(time / 256);
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function isVisitor(value: unknown): value is Visitor {
  if (typeof value !== "object" || value === null) return false;
  const visitor = value as Partial<Visitor>;
  return (
    typeof visitor.id === "string" &&
    typeof visitor.linked === "boolean" &&
    typeof visitor.session === "string" &&
    typeof visitor.seenAt === "number"
  );
}

function visitor(now: number): Visitor {
  const stored = readJsonItem(VISITOR_KEY);
  const known = isVisitor(stored) ? stored : memory;
  const next: Visitor = known
    ? {
        ...known,
        session: now - known.seenAt > SESSION_IDLE_MS ? uuidv7(now) : known.session,
        seenAt: now,
      }
    : { id: uuidv7(now), linked: false, session: uuidv7(now), seenAt: now };
  memory = next;
  writeJsonItem(VISITOR_KEY, next);
  return next;
}

function markLinked(id: string): void {
  const stored = readJsonItem(VISITOR_KEY);
  if (isVisitor(stored) && stored.id === id)
    writeJsonItem(VISITOR_KEY, { ...stored, linked: true });
  if (memory?.id === id) memory = { ...memory, linked: true };
}

function whenIdle(run: () => void): void {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 4_000 });
  } else {
    window.setTimeout(run, 1_500);
  }
}

// Straight to fetch, not lib/api/client: a note like this must not drop the layout's seeded answers.
function send(body: Beacon, visitorId: string): void {
  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
    keepalive: true,
  })
    .then((response) => (response.ok ? response.json() : null))
    .then((answer: { identified?: boolean } | null) => {
      if (answer?.identified) markLinked(visitorId);
    })
    .catch(() => {});
}

export function flushBeacon(): void {
  scheduled = false;
  if (queue.length === 0) return;
  const items = queue.slice(0, MAX_ITEMS);
  queue = [];
  const { id, linked, session } = visitor(Date.now());
  send({ visitor: id, linked, session, items }, id);
}

function onHidden(): void {
  if (document.visibilityState === "hidden") flushBeacon();
}

function enqueue(item: BeaconItem): void {
  if (!analyticsEnabled()) return;
  queue.push(item);
  if (!listening) {
    listening = true;
    document.addEventListener("visibilitychange", onHidden);
  }
  if (scheduled) return;
  scheduled = true;
  whenIdle(flushBeacon);
}

function deviceType(): "Mobile" | "Tablet" | "Desktop" {
  if (!window.matchMedia?.("(pointer: coarse)").matches) return "Desktop";
  return Math.min(window.screen.width, window.screen.height) < 600 ? "Mobile" : "Tablet";
}

// The other site's name only, and only for the page the visitor arrived on.
function referrerDomain(): string | undefined {
  try {
    const host = new URL(document.referrer).hostname;
    return host && host !== window.location.hostname ? host : undefined;
  } catch {
    return undefined;
  }
}

function utmTags(search: string): Record<string, string> | undefined {
  const params = new URLSearchParams(search);
  const tags: Record<string, string> = {};
  for (const key of TRAFFIC_UTM_KEYS) {
    const value = params.get(key)?.slice(0, 100);
    if (value) tags[key] = value;
  }
  return Object.keys(tags).length ? tags : undefined;
}

function deviceTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

// Read once, then taken off the address, so a reload or a copied link never counts the click again.
function takeEmailLanding() {
  const landing = emailLanding(window.location.search);
  if (landing)
    window.history.replaceState(window.history.state, "", withoutUtm(window.location.href));
  return landing;
}

// Once per page, on moving to the next one or closing the tab.
function leavePage(now: number): void {
  if (!openPage || openPage.left) return;
  openPage.left = true;
  const seconds = Math.min(Math.max(Math.round((now - openPage.start) / 1000), 0), 86_400);
  enqueue({ type: "leave", route: openPage.route, seconds });
}

function onPageHide(): void {
  leavePage(Date.now());
  flushBeacon();
}

// Back from the browser's page cache: the same page, open again.
function onPageShow(event: PageTransitionEvent): void {
  if (event.persisted && openPage) openPage = { ...openPage, start: Date.now(), left: false };
}

// Set before the page's own effects run, so the events they send name the right page.
export function setPageRoute(route: string): void {
  currentRoute = route;
}

export function trackPageView(route: string, pathname: string): void {
  if (!analyticsEnabled()) return;
  const now = Date.now();
  leavePage(now);
  openPage = { route, start: now, left: false };
  if (!watchingLeave) {
    watchingLeave = true;
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
  }
  const referrer = firstView ? referrerDomain() : undefined;
  firstView = false;
  const utm = utmTags(window.location.search);
  const app = dashboardSection(pathname) !== null;
  const email = app ? takeEmailLanding() : null;
  enqueue({
    type: "view",
    route,
    device: deviceType(),
    ...(referrer ? { referrer } : {}),
    ...(utm ? { utm } : {}),
    ...(app ? { timeZone: deviceTimeZone() } : {}),
    ...(email ? { email } : {}),
  });
}

export function track<E extends ClientEvent>(
  event: E,
  ...args: EventArgs<ClientEventProps[E]>
): void {
  const [props] = args;
  enqueue({ type: "event", event, route: currentRoute, ...(props ? { props } : {}) });
}

export function trackVitals(route: string, metrics: Partial<Record<string, number>>): void {
  enqueue({ type: "vitals", route, metrics });
  flushBeacon();
}

// A new visitor id after signing out, so whoever uses this browser next isn't counted as the same person.
export function resetUser(): void {
  memory = null;
  removeItem(VISITOR_KEY);
}

export function resetAnalyticsForTests(): void {
  queue = [];
  scheduled = false;
  listening = false;
  firstView = true;
  currentRoute = "/";
  memory = null;
  openPage = null;
  watchingLeave = false;
}
