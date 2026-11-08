import { describe, expect, it } from "vitest";
import { flightJsonLd, flightPayload } from "./next-flight";
import { postingFromHtml } from "./read";
import { htmlPage, LONG_POST } from "./test-fixtures";

const JOB = {
  "@context": "https://schema.org",
  "@type": "JobPosting",
  title: "Game Developer",
  description: LONG_POST,
  hiringOrganization: { "@type": "Organization", name: "micro1" },
  jobLocationType: "TELECOMMUTE",
};

function push(text: string): string {
  return `<script>self.__next_f.push([1,${JSON.stringify(text)}])</script>`;
}

// How jobs.micro1.ai ships it: next/script renders the JSON-LD on the client, so the HTML only
// has a "$1b" reference and the JSON sits in a text row of the stream.
function micro1Page(): string {
  const json = JSON.stringify(JOB);
  const row = `1b:T${Buffer.byteLength(json).toString(16)},${json}`;
  const half = Math.floor(row.length / 2);
  return htmlPage({
    head: "<title>Game Developer | Apply on Job</title>",
    body:
      '<div id="root"></div>' +
      push('5:["$","$L2",null,{"id":"jobPosting-jsonld","type":"application/ld+json","children":"$1b"}]\n') +
      // Long rows are split across scripts.
      push(row.slice(0, half)) +
      push(row.slice(half) + "\n"),
  });
}

describe("flightPayload", () => {
  it("reads the text of a stream script and ignores other scripts", () => {
    expect(flightPayload('self.__next_f.push([1,"a\\nb"]);')).toBe("a\nb");
    expect(flightPayload("self.__next_f.push([0])")).toBeNull();
    expect(flightPayload("window.dataLayer = []")).toBeNull();
    expect(flightPayload('self.__next_f.push([1,"broken])')).toBeNull();
  });
});

describe("flightJsonLd", () => {
  it("finds a JobPosting written as a text row or as an escaped string prop", () => {
    const json = JSON.stringify(JOB);
    expect(flightJsonLd([`1b:T99,${json}\n`], 5)).toEqual([json]);
    const prop = `7:["$","script",null,{"dangerouslySetInnerHTML":{"__html":${JSON.stringify(json)}}}]`;
    expect(flightJsonLd([prop], 5)).toEqual([json]);
  });

  it("skips other schema.org objects and never reads a nested one twice", () => {
    const org = JSON.stringify({ "@context": "https://schema.org", "@type": "Organization" });
    expect(flightJsonLd([org, JSON.stringify(JOB)], 5)).toEqual([JSON.stringify(JOB)]);
  });

  it("stays linear on an object that never closes", () => {
    const hostile = '{"@context":' + "{".repeat(200_000);
    const started = performance.now();
    expect(flightJsonLd([hostile], 5)).toEqual([]);
    expect(performance.now() - started).toBeLessThan(1000);
  });
});

describe("postingFromHtml on a Next.js page", () => {
  it("reads the job from the stream when the HTML has no JSON-LD tag", () => {
    const posting = postingFromHtml(micro1Page(), new URL("https://jobs.micro1.ai/post/abc"));
    expect(posting.source).toBe("jsonld");
    expect(posting.title).toBe("Game Developer");
    expect(posting.company).toBe("micro1");
    expect(posting.text).toContain("About the role");
  });
});
