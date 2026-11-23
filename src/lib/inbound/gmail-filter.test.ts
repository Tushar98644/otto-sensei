import { describe, expect, it } from "vitest";
import { GMAIL_FILTER, gmailCreateFilterUrl, gmailSearchUrl, testEmailHref } from "./gmail-filter";
import { readEmail } from "./parse";

describe("the Gmail filter", () => {
  it("is one search Gmail can save as a filter", () => {
    expect(GMAIL_FILTER).toMatch(/^from:\(greenhouse\.io OR .+\) OR subject:\(.+"otto test"\)$/);
    expect(GMAIL_FILTER.length).toBeLessThan(500);
    expect(decodeURIComponent(gmailSearchUrl().split("#search/")[1]!)).toBe(GMAIL_FILTER);
    expect(gmailCreateFilterUrl()).toMatch(
      /^https:\/\/mail\.google\.com\/mail\/u\/0\/#create-filter\/has=/,
    );
    expect(decodeURIComponent(gmailCreateFilterUrl().split("#create-filter/has=")[1]!)).toBe(
      GMAIL_FILTER,
    );
  });

  it("lets the test email through and Otto knows it's a test", () => {
    const href = new URL(testEmailHref("otto+abc@track.ottosensei.com"));
    expect(href.origin).toBe("https://mail.google.com");
    expect(href.searchParams.get("view")).toBe("cm");
    expect(href.searchParams.get("to")).toBe("otto+abc@track.ottosensei.com");
    const subject = href.searchParams.get("su")!;
    expect(GMAIL_FILTER).toContain(`"${subject.toLowerCase()}"`);
    const reading = readEmail(
      {
        from: "me@gmail.com",
        subject,
        date: null,
        text: href.searchParams.get("body")!,
        headers: {},
      },
      { now: Date.now(), zone: null },
    );
    expect(reading.kind).toBe("test");
  });
});
