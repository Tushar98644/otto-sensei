import { describe, expect, it } from "vitest";
import { resumeHrefFor, type LinkableShare } from "./resume-link";

const share = (over: Partial<LinkableShare> = {}): LinkableShare => ({
  slug: "AbCdEfGhJkLmNp",
  showContact: false,
  email: "maya@example.com",
  phone: "+1 415 555 0100",
  ...over,
});

const hidden = { showEmail: false, showPhone: false };

describe("resumeHrefFor", () => {
  it("links nothing without a live share", () => {
    expect(resumeHrefFor(null, hidden)).toBeNull();
  });

  it("links the share page when it keeps contact details off", () => {
    expect(resumeHrefFor(share(), hidden)).toBe("/s/AbCdEfGhJkLmNp");
  });

  it("never links a share that shows an email or phone the page keeps off", () => {
    expect(resumeHrefFor(share({ showContact: true }), hidden)).toBeNull();
    expect(
      resumeHrefFor(share({ showContact: true }), { showEmail: true, showPhone: false }),
    ).toBeNull();
    expect(
      resumeHrefFor(share({ showContact: true }), { showEmail: false, showPhone: true }),
    ).toBeNull();
  });

  it("links a share that shows only what the page shows too", () => {
    const both = { showEmail: true, showPhone: true };
    expect(resumeHrefFor(share({ showContact: true }), both)).toBe("/s/AbCdEfGhJkLmNp");
    expect(
      resumeHrefFor(share({ showContact: true, phone: "" }), { showEmail: true, showPhone: false }),
    ).toBe("/s/AbCdEfGhJkLmNp");
    expect(resumeHrefFor(share({ showContact: true, email: "", phone: "" }), hidden)).toBe(
      "/s/AbCdEfGhJkLmNp",
    );
  });
});
