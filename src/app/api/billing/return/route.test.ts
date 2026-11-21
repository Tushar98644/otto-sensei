import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import nextConfig from "../../../../../next.config";
import { GET, returnTarget } from "./route";

const SUB = "sub_2Kx9QmPzT7vWb3NcYd4Rf";
const PAY = "pay_8HtLq2WzXc5VbN7mKj3Pr";
const EMAIL = "ada.lovelace+jobs@example.com";

const target = (query: string) => returnTarget(new URLSearchParams(query));

function dodoReturn(query: string) {
  return GET(new Request(`https://otto.test/api/billing/return?${query}`));
}

let info: MockInstance<typeof console.info>;

beforeEach(() => {
  info = vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("returnTarget", () => {
  it("calls a paid or still-settling checkout a success for the plan it was made for", () => {
    for (const status of ["active", "succeeded", "pending", "processing"]) {
      expect(target(`plan=pro&subscription_id=${SUB}&status=${status}`)).toBe(
        "/account?checkout=success&plan=pro",
      );
    }
    expect(target("plan=max&status=active")).toBe("/account?checkout=success&plan=max");
  });

  it("reads Dodo's status leniently, ignoring case and stray spaces", () => {
    expect(target("plan=pro&status=%20Active%20")).toBe("/account?checkout=success&plan=pro");
    expect(target("plan=pro&status=SUCCEEDED")).toBe("/account?checkout=success&plan=pro");
  });

  it("keeps the trial on the way back only when the link says trial=1", () => {
    expect(target("plan=pro&trial=1&status=active")).toBe(
      "/account?checkout=success&plan=pro&trial=1",
    );
    for (const trial of ["true", "0", "", "1&trial=1"]) {
      expect(target(`plan=pro&trial=${trial}&status=active`)).toBe(
        "/account?checkout=success&plan=pro",
      );
    }
  });

  it("calls every other outcome cancelled, including a missing status", () => {
    for (const status of [
      "failed",
      "cancelled",
      "expired",
      "requires_payment_method",
      "on_hold",
      "",
      "active!",
      "active&status=failed",
    ]) {
      expect(target(`plan=pro&trial=1&status=${status}`), status).toBe(
        "/account?checkout=cancelled",
      );
    }
    expect(target("plan=pro&trial=1")).toBe("/account?checkout=cancelled");
  });

  it("passes on the page the upgrade started from, so Account can send the buyer back there", () => {
    expect(target(`plan=pro&trial=1&next=${encodeURIComponent("/studio")}&status=active`)).toBe(
      "/account?checkout=success&plan=pro&trial=1&next=%2Fstudio",
    );
    const jobs = "/dashboard/jobs?q=design&remote=1#top";
    expect(target(`plan=max&next=${encodeURIComponent(jobs)}&status=succeeded`)).toBe(
      `/account?checkout=success&plan=max&next=${encodeURIComponent(jobs)}`,
    );
    expect(target("plan=pro&next=/studio&status=active")).toBe(
      "/account?checkout=success&plan=pro&next=%2Fstudio",
    );
  });

  it("drops a next that isn't a page on this site, and keeps the rest of the return", () => {
    for (const next of [
      "https://evil.example/studio",
      "//evil.example",
      "/\\evil.example",
      "%2F%2Fevil.example",
      encodeURIComponent("/\t/evil.example"),
      encodeURIComponent("/.//evil.example"),
      encodeURIComponent("/x/..//evil.example"),
      "javascript:alert(1)",
      "studio",
      encodeURIComponent("/account?upgrade=1"),
      "/login",
      "/api/billing/checkout",
      `/${"a".repeat(600)}`,
      "",
    ]) {
      expect(target(`plan=pro&next=${next}&status=active`), next).toBe(
        "/account?checkout=success&plan=pro",
      );
    }
    expect(target("plan=pro&next=/studio&next=/dashboard&status=active")).toBe(
      "/account?checkout=success&plan=pro",
    );
    expect(target("plan=pro&status=active")).toBe("/account?checkout=success&plan=pro");
  });

  it("goes to plain Account on a cancelled checkout, even with a next", () => {
    expect(target("plan=pro&next=%2Fstudio&status=failed")).toBe("/account?checkout=cancelled");
    expect(target("next=%2Fstudio&status=active")).toBe("/account");
  });

  it("sends a return with no plan we sell to the plain account page, whatever the status", () => {
    for (const plan of ["", "free", "enterprise", "PRO", "pro&plan=max"]) {
      for (const status of ["active", "failed"]) {
        expect(target(`plan=${plan}&status=${status}&trial=1`), `${plan} ${status}`).toBe(
          "/account",
        );
      }
    }
    expect(target(`subscription_id=${SUB}&status=active`)).toBe("/account");
    expect(target("")).toBe("/account");
  });
});

describe("GET /api/billing/return", () => {
  it("answers with a 303 to the account page that no cache may keep", () => {
    const res = dodoReturn(`plan=pro&trial=1&subscription_id=${SUB}&status=active&email=x%40y.z`);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(
      "https://otto.test/account?checkout=success&plan=pro&trial=1",
    );
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("never passes the buyer's email or Dodo's ids on, in the redirect or the log", () => {
    const queries = [
      `plan=pro&subscription_id=${SUB}&status=active&email=${encodeURIComponent(EMAIL)}`,
      `plan=max&payment_id=${PAY}&status=failed&email=${EMAIL}`,
      `subscription_id=${SUB}&payment_id=${PAY}&status=succeeded&email=${EMAIL}&license_key=lk_1`,
    ];
    for (const query of queries) {
      const location = dodoReturn(query).headers.get("location") ?? "";
      for (const secret of [SUB, PAY, "email", "ada.lovelace", "example.com", "lk_1"]) {
        expect(location).not.toContain(secret);
      }
    }
    const logged = JSON.stringify(info.mock.calls);
    for (const secret of [SUB, PAY, "ada.lovelace", "example.com", "lk_1"]) {
      expect(logged).not.toContain(secret);
    }
  });

  it("logs only a plain status word, never what a forged status carries", () => {
    dodoReturn("plan=pro&status=active");
    dodoReturn(`plan=pro&status=${encodeURIComponent(EMAIL)}`);
    dodoReturn("plan=pro");
    expect(info.mock.calls.map(([, fields]) => fields)).toEqual([
      { status: "active" },
      { status: "other" },
      { status: "none" },
    ]);
  });

  it("still finds Dodo's status when it appends its params with a second question mark", () => {
    expect(
      dodoReturn(`plan=pro?subscription_id=${SUB}&status=active`).headers.get("location"),
    ).toBe("https://otto.test/account?checkout=success&plan=pro");
    expect(
      dodoReturn(`plan=pro&trial=1?status=active&email=${EMAIL}`).headers.get("location"),
    ).toBe("https://otto.test/account?checkout=success&plan=pro&trial=1");
  });

  it("keeps Dodo's params out of next when they follow it after a second question mark", () => {
    const location =
      dodoReturn(
        `plan=pro&next=%2Fstudio%3Fstep%3Dtailor?subscription_id=${SUB}&status=active&email=${EMAIL}`,
      ).headers.get("location") ?? "";
    expect(location).toBe(
      "https://otto.test/account?checkout=success&plan=pro&next=%2Fstudio%3Fstep%3Dtailor",
    );
    for (const secret of [SUB, "ada.lovelace", "example.com"]) {
      expect(location).not.toContain(secret);
    }
  });

  it("stays on our own site whatever the query holds", () => {
    for (const query of ["plan=https://evil.example&status=active", "plan=//evil.example"]) {
      expect(dodoReturn(query).headers.get("location")).toBe("https://otto.test/account");
    }
  });
});

describe("security headers", () => {
  it("allow payment requests nowhere and name no Paddle origin now that checkout is Dodo's own page", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    expect(rules.map((rule) => rule.source)).toEqual(["/:path*"]);
    const policy = rules[0]?.headers.find((header) => header.key === "Permissions-Policy");
    expect(policy?.value).toBe("camera=(), microphone=(self), geolocation=(), payment=()");
    expect(JSON.stringify(rules)).not.toMatch(/paddle/i);
  });
});
