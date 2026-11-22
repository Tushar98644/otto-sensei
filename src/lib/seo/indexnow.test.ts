import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  INDEXNOW_BATCH,
  INDEXNOW_KEY,
  accepted,
  changedUrls,
  indexNowPayloads,
  keyFilePath,
  nextState,
  parseSitemap,
} from "./indexnow";

const SITE = "https://www.ottosensei.com";
const XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
<loc>https://www.ottosensei.com</loc>
<lastmod>2026-11-22</lastmod>
</url>
<url>
<loc>https://www.ottosensei.com/compare/rezi?a=1&amp;b=2</loc>
<lastmod>2026-11-18</lastmod>
</url>
<url>
<loc>https://www.ottosensei.com/privacy</loc>
</url>
</urlset>`;

describe("IndexNow", () => {
  it("serves the key from a file at the site root that holds only the key", () => {
    expect(INDEXNOW_KEY).toMatch(/^[a-f0-9]{32}$/);
    expect(keyFilePath()).toBe(`/${INDEXNOW_KEY}.txt`);
    const file = new URL(`../../../public${keyFilePath()}`, import.meta.url);
    expect(readFileSync(file, "utf8").trim()).toBe(INDEXNOW_KEY);
  });

  it("reads each URL and its lastmod from a sitemap, decoding entities", () => {
    expect(parseSitemap(XML)).toEqual([
      { url: SITE, lastmod: "2026-11-22" },
      { url: `${SITE}/compare/rezi?a=1&b=2`, lastmod: "2026-11-18" },
      { url: `${SITE}/privacy`, lastmod: "" },
    ]);
  });

  it("sends everything the first time, then only new pages and moved lastmods", () => {
    const entries = parseSitemap(XML);
    expect(changedUrls(entries, null)).toHaveLength(3);
    const sent = nextState(entries);
    expect(changedUrls(entries, sent)).toEqual([]);
    const later = [
      { url: SITE, lastmod: "2026-11-23" },
      { url: `${SITE}/privacy`, lastmod: "" },
      { url: `${SITE}/resume-builder`, lastmod: "2026-11-23" },
    ];
    expect(changedUrls(later, sent)).toEqual([SITE, `${SITE}/resume-builder`]);
  });

  it("posts only the site's own URLs, with the key's location, in batches the protocol takes", () => {
    const urls = [`${SITE}/a`, "https://elsewhere.example.com/b", "not a url"];
    expect(indexNowPayloads(SITE, urls)).toEqual([
      {
        host: "www.ottosensei.com",
        key: INDEXNOW_KEY,
        keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`,
        urlList: [`${SITE}/a`],
      },
    ]);
    const many = Array.from({ length: INDEXNOW_BATCH + 1 }, (_, i) => `${SITE}/p/${i}`);
    expect(indexNowPayloads(SITE, many).map((payload) => payload.urlList.length)).toEqual([
      INDEXNOW_BATCH,
      1,
    ]);
    expect(indexNowPayloads(SITE, [])).toEqual([]);
  });

  it("counts 200 and 202 as received", () => {
    expect([200, 202, 400, 403, 422, 429].map(accepted)).toEqual([
      true,
      true,
      false,
      false,
      false,
      false,
    ]);
  });
});
