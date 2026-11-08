// The last check before anything leaves for PostHog, in the browser and on the server. The event
// types already allow only names, counts and flags; this is the net for what the SDK adds on its
// own (page URLs, referrers) and for a value that slips past the types.

type Props = Record<string, unknown>;

const EMAIL = /[\p{L}\p{N}._%+*-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/u;
// Share links are the key to someone's resume.
const SHARE_PATH = /(\/s\/)[^/?#\s]+/g;
// Longer than this is pasted text (a resume line, a job post), not a label we chose. The SDK's own
// "$" values (user agent, ids) are exempt: they can be long but never hold what someone typed.
const MAX_STRING = 120;

function isUrlKey(key: string): boolean {
  const name = key.toLowerCase();
  return name.includes("url") || name.includes("referrer") || name.includes("pathname") || name === "$host";
}

/** Drops the query string and fragment (a share token, an email in a link) and masks share paths. */
export function cleanUrl(value: string): string {
  const cut = value.search(/[?#]/);
  const path = cut === -1 ? value : value.slice(0, cut);
  return path.replace(SHARE_PATH, "$1:token");
}

function cleanValue(key: string, value: unknown): unknown {
  if (typeof value !== "string") return value;
  if (isUrlKey(key)) {
    const url = cleanUrl(value);
    return EMAIL.test(url) ? undefined : url;
  }
  if (EMAIL.test(value)) return undefined;
  if (value.length > MAX_STRING && !key.startsWith("$")) return undefined;
  return value;
}

/** A copy without anything that could name a person; nested objects and arrays are dropped whole. */
export function cleanProps(props: Props | undefined): Props {
  const clean: Props = {};
  if (!props) return clean;
  for (const [key, value] of Object.entries(props)) {
    if (value !== null && typeof value === "object") continue;
    const kept = cleanValue(key, value);
    if (kept !== undefined) clean[key] = kept;
  }
  return clean;
}

/**
 * True when the browser asked not to be tracked (Do Not Track or Global Privacy Control), or when
 * there's no browser to ask. `legacyDnt` is the old window.doNotTrack some browsers still use.
 */
export function trackingRefused(nav: Navigator | undefined, legacyDnt?: string | null): boolean {
  if (!nav) return true;
  const signals = nav as Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string };
  const dnt = nav.doNotTrack ?? signals.msDoNotTrack ?? legacyDnt;
  return dnt === "1" || dnt === "yes" || signals.globalPrivacyControl === true;
}
