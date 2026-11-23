import { describe, expect, it } from "vitest";
import { GMAIL_FILTER, gmailFilterFile, gmailSearchUrl, testEmailHref } from "./gmail-filter";
import { readEmail } from "./parse";

describe("the Gmail filter", () => {
  it("is one search Gmail can save as a filter", () => {
    expect(GMAIL_FILTER).toMatch(/^from:\(greenhouse\.io OR .+\) OR subject:\(.+"otto test"\)$/);
    expect(GMAIL_FILTER.length).toBeLessThan(500);
    expect(decodeURIComponent(gmailSearchUrl().split("#search/")[1]!)).toBe(GMAIL_FILTER);
  });

  it("lets the test email through and Otto knows it's a test", () => {
    const href = new URL(testEmailHref("otto+abc@track.ottosensei.com"));
    expect(href.protocol).toBe("mailto:");
    const subject = href.searchParams.get("subject")!;
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

  it("downloads as a file Gmail's Import filters takes, forwarding to the Otto address", () => {
    const address = `otto+a&b"<c>@track.ottosensei.com`;
    const xml = gmailFilterFile(address, new Date("2026-11-23T10:00:00.123Z"));
    expect(
      xml.startsWith(
        `<?xml version="1.0" encoding="UTF-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom" xmlns:apps="http://schemas.google.com/apps/2006">`,
      ),
    ).toBe(true);
    expect(xml.match(/<entry>/g)).toHaveLength(1);
    expect(xml).toContain(`<category term="filter"></category>`);
    expect(xml).toContain("<updated>2026-11-23T10:00:00Z</updated>");

    // Well formed: every tag closes in order, and no bare & or < is left in the text.
    const open: string[] = [];
    for (const [tag, close, name, self] of xml.matchAll(/<(\/?)([\w:]+)[^>]*?(\/?)>/g)) {
      if (tag.startsWith("<?")) continue;
      if (self) continue;
      if (close) expect(open.pop()).toBe(name);
      else open.push(name!);
    }
    expect(open).toEqual([]);
    expect(xml.replace(/<[^>]*>/g, "")).not.toMatch(/&(?!amp;|lt;|gt;|quot;)|</);

    const unescape = (value: string) =>
      value
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");
    const properties = Object.fromEntries(
      [...xml.matchAll(/<apps:property name="(\w+)" value="([^"]*)"\/>/g)].map(
        ([, name, value]) => [name, unescape(value!)],
      ),
    );
    expect(properties).toEqual({ hasTheWord: GMAIL_FILTER, forwardTo: address });
  });
});
