// Link previews fetch a pasted link at once. In-app browsers stay countable ("LinkedInApp" vs
// "LinkedInBot").
const AUTOMATED_AGENT = new RegExp(
  [
    // Cubot is a phone brand, not a crawler.
    "(?<!cu)bot\\b",
    "crawl",
    "spider",
    "slurp",
    "preview",
    "facebookexternalhit",
    "facebookcatalog",
    "embedly",
    "whatsapp",
    "skypeuripreview",
    "vkshare",
    "pinterest",
    "google-inspectiontool",
    "google-read-aloud",
    "feedfetcher",
    "headlesschrome",
    "lighthouse",
    "pagespeed",
    "phantomjs",
    "puppeteer",
    "playwright",
    "selenium",
    "curl/",
    "wget/",
    "python",
    "httpx",
    "aiohttp",
    "go-http-client",
    "java/",
    "okhttp",
    "axios/",
    "node-fetch",
    "undici",
    "libwww",
    "scrapy",
    "apache-httpclient",
    "postmanruntime",
    "insomnia",
    "uptime",
    "pingdom",
    "monitor",
  ].join("|"),
  "i",
);

export function isAutomatedAgent(userAgent: string | null | undefined): boolean {
  const agent = userAgent?.trim() ?? "";
  // Every browser sends one; a request without it is a script.
  if (agent === "") return true;
  return AUTOMATED_AGENT.test(agent);
}

type HeaderReader = { get(name: string): string | null };

// Speculation rules and link prefetch: nobody has read the page yet.
export function isPrefetch(headers: HeaderReader): boolean {
  // Next's router prefetches in-app links ahead of a click too.
  if (headers.get("next-router-prefetch") !== null) return true;
  const purpose = [
    headers.get("sec-purpose"),
    headers.get("purpose"),
    headers.get("x-purpose"),
    headers.get("x-moz"),
  ]
    .filter((value): value is string => value !== null)
    .join(" ")
    .toLowerCase();
  return /prefetch|prerender|preview/.test(purpose);
}

export type Visit = { userAgent: string | null; prefetch: boolean };

export function countsAsView(visit: Visit): boolean {
  return !visit.prefetch && !isAutomatedAgent(visit.userAgent);
}
