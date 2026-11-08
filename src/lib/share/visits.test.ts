import { describe, expect, it } from "vitest";
import { countsAsView, isAutomatedAgent, isPrefetch } from "./visits";

const CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const LINKEDIN_APP =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.30.1";
const CUBOT_PHONE =
  "Mozilla/5.0 (Linux; Android 10; CUBOT X30) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

function headers(values: Record<string, string>) {
  return new Headers(values);
}

describe("isAutomatedAgent", () => {
  it.each([
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
    "LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)",
    "Twitterbot/1.0",
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "WhatsApp/2.23.20.0 A",
    "TelegramBot (like TwitterBot)",
    "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SkypeUriPreview Preview/0.5",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36",
    "curl/8.7.1",
    "python-requests/2.32.3",
    "Go-http-client/2.0",
    "node-fetch/1.0 (+https://github.com/bitinn/node-fetch)",
    "UptimeRobot/2.0",
  ])("treats %s as automated", (agent) => {
    expect(isAutomatedAgent(agent)).toBe(true);
  });

  it("treats a missing or blank user agent as a script", () => {
    expect(isAutomatedAgent(null)).toBe(true);
    expect(isAutomatedAgent(undefined)).toBe(true);
    expect(isAutomatedAgent("   ")).toBe(true);
  });

  it.each([CHROME, IPHONE, LINKEDIN_APP, CUBOT_PHONE])("counts a person on %s", (agent) => {
    expect(isAutomatedAgent(agent)).toBe(false);
  });
});

describe("isPrefetch", () => {
  it("spots speculative loads by any of their headers", () => {
    expect(isPrefetch(headers({ "sec-purpose": "prefetch;prerender" }))).toBe(true);
    expect(isPrefetch(headers({ purpose: "prefetch" }))).toBe(true);
    expect(isPrefetch(headers({ "x-purpose": "preview" }))).toBe(true);
    expect(isPrefetch(headers({ "x-moz": "prefetch" }))).toBe(true);
    expect(isPrefetch(headers({ "next-router-prefetch": "1" }))).toBe(true);
  });

  it("lets ordinary page loads through", () => {
    expect(isPrefetch(headers({ accept: "text/html" }))).toBe(false);
  });
});

describe("countsAsView", () => {
  it("needs a real browser that isn't prefetching", () => {
    expect(countsAsView({ userAgent: CHROME, prefetch: false })).toBe(true);
    expect(countsAsView({ userAgent: CHROME, prefetch: true })).toBe(false);
    expect(countsAsView({ userAgent: "Twitterbot/1.0", prefetch: false })).toBe(false);
  });
});
