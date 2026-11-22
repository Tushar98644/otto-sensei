// IndexNow tells Bing, Yandex, Seznam and Naver which pages changed. The key is public by design:
// search engines fetch it from /<key>.txt to check that the ping comes from the site's owner.
export const INDEXNOW_KEY = "6130424be228dbe493dedb6573677d0a";

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

// The protocol takes up to 10,000 URLs in one post.
export const INDEXNOW_BATCH = 10_000;

export type SitemapEntry = { url: string; lastmod: string };

// What was last sent: each URL with the lastmod it had then.
export type IndexNowState = Record<string, string>;

export function keyFilePath(key: string = INDEXNOW_KEY): string {
  return `/${key}.txt`;
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
};

function decode(text: string): string {
  return text.trim().replace(/&(?:amp|lt|gt|quot|apos);/g, (entity) => ENTITIES[entity] ?? entity);
}

export function parseSitemap(xml: string): SitemapEntry[] {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].flatMap(([, body = ""]) => {
    const loc = /<loc>([\s\S]*?)<\/loc>/.exec(body)?.[1];
    if (!loc) return [];
    const lastmod = /<lastmod>([\s\S]*?)<\/lastmod>/.exec(body)?.[1];
    return [{ url: decode(loc), lastmod: lastmod ? decode(lastmod) : "" }];
  });
}

// New pages and pages whose lastmod moved; with nothing sent before, every page.
export function changedUrls(
  entries: readonly SitemapEntry[],
  sent: IndexNowState | null,
): string[] {
  const urls = entries
    .filter((entry) => !sent || sent[entry.url] !== entry.lastmod)
    .map((entry) => entry.url);
  return [...new Set(urls)];
}

export function nextState(entries: readonly SitemapEntry[]): IndexNowState {
  return Object.fromEntries(entries.map((entry) => [entry.url, entry.lastmod]));
}

export type IndexNowPayload = {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
};

// Only the site's own URLs: the protocol refuses a batch with another host in it.
export function indexNowPayloads(
  site: string,
  urls: readonly string[],
  key: string = INDEXNOW_KEY,
): IndexNowPayload[] {
  const origin = new URL(site);
  const own = urls.filter((url) => {
    try {
      return new URL(url).host === origin.host;
    } catch {
      return false;
    }
  });
  const payloads: IndexNowPayload[] = [];
  for (let start = 0; start < own.length; start += INDEXNOW_BATCH) {
    payloads.push({
      host: origin.host,
      key,
      keyLocation: new URL(keyFilePath(key), origin).toString(),
      urlList: own.slice(start, start + INDEXNOW_BATCH),
    });
  }
  return payloads;
}

// 200 means received; 202 means received while the engine still checks the key.
export function accepted(status: number): boolean {
  return status === 200 || status === 202;
}
