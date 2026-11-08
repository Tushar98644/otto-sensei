import { describe, expect, it } from "vitest";
import { attribute, decodeEntities, htmlToText, scanPage } from "./html";
import { htmlPage, jsonLdScript } from "./test-fixtures";

describe("decodeEntities", () => {
  it("decodes named and numeric references, one level at a time", () => {
    expect(decodeEntities("R&amp;D &ndash; caf&eacute; &#8217;s &#x2019; &unknown;")).toBe(
      "R&D – café ’s ’ &unknown;",
    );
    expect(decodeEntities("&amp;lt;p&amp;gt;")).toBe("&lt;p&gt;");
    expect(decodeEntities("&#0; &#xD800;")).toBe("\uFFFD \uFFFD");
  });
});

describe("htmlToText", () => {
  it("turns list items into '- ' lines and keeps paragraph breaks", () => {
    const html =
      "<h2>What you'll do</h2>\n<ul>\n  <li>Build APIs</li>\n  <li>Ship   fast</li>\n</ul>\n<p>First paragraph.</p><p>Second<br>line.</p>";
    expect(htmlToText(html)).toBe(
      "What you'll do\n\n- Build APIs\n- Ship fast\n\nFirst paragraph.\n\nSecond\nline.",
    );
  });

  it("keeps a paragraph inside a list item on its bullet line", () => {
    expect(htmlToText("<ul><li><p>One</p></li><li><p>Two</p></li></ul><p>After</p>")).toBe(
      "- One\n- Two\n\nAfter",
    );
    expect(htmlToText("<ul><li></li></ul><p>After</p>")).toBe("After");
  });

  it("turns typed bullets into '- '", () => {
    expect(htmlToText("<p>• Identify leads</p><p>· Close deals</p>")).toBe(
      "- Identify leads\n- Close deals",
    );
  });

  it("drops scripts, styles and comments but keeps a lone '<' in text", () => {
    const html =
      "<style>p{color:red}</style><p>Pay < $100k<!-- hidden --></p><script>alert('x</p>')</script><p>End</p>";
    expect(htmlToText(html)).toBe("Pay < $100k\n\nEnd");
  });

  it("separates table cells and decodes text", () => {
    expect(
      htmlToText("<table><tr><td>Salary</td><td>$90k&nbsp;&ndash;&nbsp;$120k</td></tr></table>"),
    ).toBe("Salary $90k – $120k");
  });

  it("stays linear on hostile input", () => {
    const hostile = "<script>".repeat(50_000) + "<a href='".repeat(50_000) + "<".repeat(200_000);
    const started = performance.now();
    htmlToText(hostile);
    scanPage(hostile);
    expect(performance.now() - started).toBeLessThan(2_000);
  });
});

describe("attribute", () => {
  it("reads quoted and unquoted values", () => {
    expect(attribute(' type="application/ld+json" id=x', "type")).toBe("application/ld+json");
    expect(attribute(" content='Acme &amp; Co'", "content")).toBe("Acme & Co");
    expect(attribute(" data-type=x", "type")).toBeNull();
  });
});

describe("scanPage", () => {
  it("reads the title, first heading, meta tags, JSON-LD and the main text", () => {
    const html = htmlPage({
      head:
        '<title>Backend Engineer | Acme Careers</title><meta property="og:site_name" content="Acme">' +
        jsonLdScript({ "@type": "JobPosting", title: "Backend Engineer" }),
      body:
        '<header><a href="/">Acme</a><nav><a>Jobs</a><a>About</a></nav></header>' +
        "<main><h1>Backend Engineer</h1><p>Build payments APIs.</p><form><button>Apply</button></form></main>" +
        "<footer>© Acme 2026</footer>",
    });
    const page = scanPage(html);
    expect(page.title).toBe("Backend Engineer | Acme Careers");
    expect(page.h1).toBe("Backend Engineer");
    expect(page.meta.get("og:site_name")).toBe("Acme");
    expect(page.jsonLd).toHaveLength(1);
    expect(page.main).toBe("Backend Engineer\n\nBuild payments APIs.");
    expect(page.body).toBe("Backend Engineer\n\nBuild payments APIs.");
    expect(page.challenge).toBe(false);
  });

  it("finds the heading even inside a skipped page header, and skips self-closing chrome", () => {
    const page = scanPage(
      htmlPage({
        body: "<header><h1>Data Analyst</h1></header><svg/><article><p>Text</p></article>",
      }),
    );
    expect(page.h1).toBe("Data Analyst");
    expect(page.article).toBe("Text");
  });

  it("spots bot check pages", () => {
    expect(
      scanPage(htmlPage({ head: "<title>Just a moment...</title>", body: "<p>Checking</p>" }))
        .challenge,
    ).toBe(true);
    expect(
      scanPage(
        htmlPage({
          body: '<script src="/cdn-cgi/challenge-platform/h/b/orchestrate/chl_page/v1"></script>',
        }),
      ).challenge,
    ).toBe(true);
  });
});
