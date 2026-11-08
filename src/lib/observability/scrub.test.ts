import type { ErrorEvent } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";
import { safeTags, scrubBreadcrumb, scrubEvent, scrubMessage, scrubText } from "./scrub";

const RESUME = `Maya Chen\nmaya.chen@example.com · +1 (415) 555-0123\n${"Led a team of five engineers. ".repeat(20)}`;

function event(overrides: Partial<ErrorEvent>): ErrorEvent {
  return { type: undefined, ...overrides };
}

describe("scrubText", () => {
  it.each([
    ["write to maya.chen@example.com today", "write to [email] today"],
    ["masked al***@gmail.com", "masked [email]"],
    ["call +1 (415) 555-0123", "call [phone]"],
    ["call 415-555-0123 or +44 20 7946 0958", "call [phone] or [phone]"],
    ["bare 4155550123", "bare [phone]"],
    ["from 203.0.113.7", "from [ip]"],
    ["open /s/abc123XYZ now", "open /s/[link] now"],
  ])("masks %j", (input, expected) => {
    expect(scrubText(input)).toBe(expected);
  });

  it.each([
    "resume 550e8400-e29b-41d4-a716-446655440000 not found",
    "on 2026-11-07 at 12:30",
    "retry 3 of 5 after 1500 ms",
    "status 404 for page 12",
  ])("leaves ids, dates and small numbers alone: %j", (input) => {
    expect(scrubText(input)).toBe(input);
  });
});

describe("scrubMessage", () => {
  it("cuts the bound parameters out of a database error", () => {
    const message =
      'Failed query: insert into "users" ("email") values ($1)\nparams: maya@example.com';
    expect(scrubMessage(message)).toBe('Failed query: insert into "users" ("email") values ($1)');
  });

  it("caps pasted text instead of sending it whole", () => {
    const out = scrubMessage(`Unexpected token in ${RESUME}`);
    expect(out.length).toBeLessThan(320);
    expect(out).toContain("[cut]");
    expect(out).not.toContain("maya.chen@example.com");
    expect(out).not.toContain("555-0123");
  });
});

describe("scrubEvent", () => {
  it("drops request bodies, cookies, query strings and auth headers", () => {
    const out = scrubEvent(
      event({
        request: {
          url: "https://ottoresume.com/auth/callback?code=secret-oauth-code#frag",
          method: "POST",
          data: { resumeText: RESUME },
          cookies: { "sb-access-token": "jwt" },
          query_string: "code=secret-oauth-code",
          headers: {
            authorization: "Bearer abc",
            cookie: "sb-access-token=jwt",
            "x-forwarded-for": "203.0.113.7",
            "user-agent": "Mozilla/5.0",
          },
        },
      }),
    );
    expect(out.request).toEqual({
      url: "https://ottoresume.com/auth/callback",
      method: "POST",
      headers: { "user-agent": "Mozilla/5.0" },
    });
  });

  it("keeps only the user id", () => {
    const out = scrubEvent(
      event({
        user: {
          id: "user_1",
          email: "maya@example.com",
          ip_address: "203.0.113.7",
          username: "maya",
        },
      }),
    );
    expect(out.user).toEqual({ id: "user_1" });
  });

  it("masks exception messages and removes local variables", () => {
    const out = scrubEvent(
      event({
        exception: {
          values: [
            {
              type: "Error",
              value: "No account for maya@example.com",
              stacktrace: { frames: [{ function: "load", vars: { resume: RESUME } }] },
            },
          ],
        },
      }),
    );
    const value = out.exception?.values?.[0];
    expect(value?.value).toBe("No account for [email]");
    expect(value?.stacktrace?.frames?.[0]).toEqual({ function: "load" });
  });

  it("filters sensitive keys and long text in extra, contexts and tags", () => {
    const out = scrubEvent(
      event({
        extra: {
          resumeId: "r_1",
          jobText: "Senior engineer",
          summary: "short",
          note: RESUME,
          nested: { userEmail: "x" },
        },
        contexts: { app: { route: "/studio" }, debug: { paste: RESUME } },
        tags: { area: "studio", contact: "maya@example.com" },
      }),
    );
    expect(out.extra).toEqual({
      resumeId: "r_1",
      jobText: "[filtered]",
      summary: "[filtered]",
      note: `[removed: ${RESUME.length} characters]`,
      nested: { userEmail: "[filtered]" },
    });
    expect(out.contexts).toEqual({
      app: { route: "/studio" },
      debug: { paste: `[removed: ${RESUME.length} characters]` },
    });
    expect(out.tags).toEqual({ area: "studio", contact: "[email]" });
  });

  it("scrubs breadcrumbs and share links in the transaction", () => {
    const out = scrubEvent(
      event({
        transaction: "/s/abc123secret",
        breadcrumbs: [
          { category: "console", message: "saving for maya@example.com" },
          {
            category: "fetch",
            data: { url: "/api/draft?email=maya@example.com", status_code: 500 },
          },
        ],
      }),
    );
    expect(out.transaction).toBe("/s/[link]");
    expect(out.breadcrumbs).toEqual([
      { category: "console", message: "saving for [email]" },
      { category: "fetch", data: { url: "/api/draft", status_code: 500 } },
    ]);
    expect(JSON.stringify(out)).not.toContain("maya@example.com");
  });
});

describe("scrubBreadcrumb", () => {
  it("strips query strings from navigation breadcrumbs", () => {
    expect(
      scrubBreadcrumb({
        category: "navigation",
        data: { from: "/login?next=/s/tok", to: "/studio?x=1" },
      }),
    ).toEqual({
      category: "navigation",
      data: { from: "/login", to: "/studio" },
    });
  });
});

describe("safeTags", () => {
  it("keeps safe fields and drops sensitive or oversized ones", () => {
    expect(
      safeTags({
        route: "/api/draft",
        status: 502,
        retried: true,
        userId: "u_1",
        email: "maya@example.com",
        accessToken: "abc",
        code: "123456",
        reason: "no account for al***@example.com",
        skipped: undefined,
        empty: null,
        long: "x".repeat(201),
        "has space": "ok",
      }),
    ).toEqual({
      route: "/api/draft",
      status: "502",
      retried: "true",
      userId: "u_1",
      reason: "no account for [email]",
      has_space: "ok",
    });
  });
});
