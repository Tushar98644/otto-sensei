import { describe, expect, it } from "vitest";
import { cleanProps, cleanUrl, trackingRefused, trackingRefusedByHeaders } from "./privacy";

describe("cleanProps", () => {
  it("keeps names, counts and flags", () => {
    expect(cleanProps({ source: "pdf", checks: 12, demo: false, nothing: null })).toEqual({
      source: "pdf",
      checks: 12,
      demo: false,
      nothing: null,
    });
  });

  it("drops anything that looks like an email, wherever it is", () => {
    const props = cleanProps({
      label: "jane.doe@example.com",
      note: "write to jo@mail.co.uk today",
    });
    expect(props).toEqual({});
  });

  it("drops long text, which is pasted resume or job text, not a label we chose", () => {
    const line =
      "Led a team of 8 engineers to rebuild the billing system, cutting failed payments by 40% ".repeat(
        2,
      );
    expect(cleanProps({ line })).toEqual({});
  });

  it("keeps the SDK's own long values, such as the user agent", () => {
    const agent =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
    expect(cleanProps({ $raw_user_agent: agent })).toEqual({ $raw_user_agent: agent });
  });

  it("drops nested objects and arrays whole", () => {
    expect(cleanProps({ resume: { name: "Jane" }, skills: ["Go", "SQL"], ok: 1 })).toEqual({
      ok: 1,
    });
  });

  it("strips query strings and share tokens from URLs", () => {
    expect(
      cleanProps({
        $current_url: "https://otto.example/s/abc123XYZ?ref=jane@example.com#top",
        $pathname: "/s/abc123XYZ",
        $initial_current_url: "https://otto.example/login?next=/studio",
      }),
    ).toEqual({
      $current_url: "https://otto.example/s/:token",
      $pathname: "/s/:token",
      $initial_current_url: "https://otto.example/login",
    });
  });

  it("drops a URL whose path still holds an email", () => {
    expect(cleanProps({ $current_url: "https://otto.example/u/jane@example.com" })).toEqual({});
  });

  it("returns an empty object for nothing", () => {
    expect(cleanProps(undefined)).toEqual({});
  });
});

describe("cleanUrl", () => {
  it("leaves a plain path alone", () => {
    expect(cleanUrl("https://otto.example/studio")).toBe("https://otto.example/studio");
  });
});

describe("trackingRefused", () => {
  const nav = (fields: Record<string, unknown>) => fields as unknown as Navigator;

  it("honours Do Not Track, old and new spellings", () => {
    expect(trackingRefused(nav({ doNotTrack: "1" }))).toBe(true);
    expect(trackingRefused(nav({ doNotTrack: null, msDoNotTrack: "1" }))).toBe(true);
    expect(trackingRefused(nav({ doNotTrack: null }), "yes")).toBe(true);
  });

  it("honours Global Privacy Control", () => {
    expect(trackingRefused(nav({ doNotTrack: null, globalPrivacyControl: true }))).toBe(true);
  });

  it("allows tracking when the browser says nothing", () => {
    expect(trackingRefused(nav({ doNotTrack: null }))).toBe(false);
    expect(trackingRefused(nav({ doNotTrack: "unspecified" }))).toBe(false);
  });

  it("refuses when there's no browser", () => {
    expect(trackingRefused(undefined)).toBe(true);
  });
});

describe("trackingRefusedByHeaders", () => {
  it("honours Do Not Track and Global Privacy Control sent with a request", () => {
    expect(trackingRefusedByHeaders(new Headers({ dnt: "1" }))).toBe(true);
    expect(trackingRefusedByHeaders(new Headers({ "sec-gpc": "1" }))).toBe(true);
    expect(trackingRefusedByHeaders(new Headers({ dnt: "0" }))).toBe(false);
    expect(trackingRefusedByHeaders(new Headers())).toBe(false);
  });
});
