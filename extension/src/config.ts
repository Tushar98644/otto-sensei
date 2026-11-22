declare const __OTTO_ORIGIN__: string | undefined;
declare const __OTTO_DEV__: boolean | undefined;

// Set by extension/build.ts: the dev build talks to localhost:3314, the store build to ottosensei.com.
export const OTTO_ORIGIN: string =
  typeof __OTTO_ORIGIN__ === "string" ? __OTTO_ORIGIN__ : "http://localhost:3314";

export function ottoUrl(path: string): string {
  return `${OTTO_ORIGIN}${path}`;
}

// Match data older than this is refreshed in the background; the badge never waits for it.
export const PROFILE_TTL_MS = 3 * 60 * 60 * 1000;
// A filled form whose thank-you page hasn't shown in this long isn't waited for any more.
export const PENDING_TTL_MS = 6 * 60 * 60 * 1000;
// A visit to Otto itself (where resumes change) refreshes sooner.
export const OTTO_VISIT_TTL_MS = 2 * 60 * 1000;

// The dev build opens its shadow root, so browser tests can reach the badge; the store build keeps it closed.
export const DEV_BUILD: boolean = typeof __OTTO_DEV__ === "boolean" ? __OTTO_DEV__ : true;
