import { describe, expect, it } from "vitest";
import {
  countElements,
  countPictures,
  declaredPageCount,
  decodeXmlEntities,
  hasBrokenTags,
  hasMultipleColumns,
  lineBreaksAsText,
  partText,
  stripFallbacks,
  wordPrefix,
} from "./docx-xml";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

describe("wordPrefix", () => {
  it("finds the prefix bound to WordprocessingML", () => {
    expect(wordPrefix(`<w:document xmlns:w="${W}">`)).toBe("w:");
    expect(wordPrefix(`<x:document xmlns:x="${W}">`)).toBe("x:");
    expect(wordPrefix(`<document xmlns="${W}">`)).toBe("");
    expect(wordPrefix("<anything/>")).toBe("w:");
  });

  it("lets callers count elements under any prefix", () => {
    const xml = `<x:document xmlns:x="${W}"><x:tbl><x:tblPr/></x:tbl><x:tbl/></x:document>`;
    expect(countElements(xml, `${wordPrefix(xml)}tbl`)).toBe(2);
  });
});

describe("stripFallbacks", () => {
  it("drops fallback copies, including empty and unclosed ones", () => {
    expect(stripFallbacks("a<mc:Choice>keep</mc:Choice><mc:Fallback>drop</mc:Fallback>b<mc:Fallback/>c")).toBe(
      "a<mc:Choice>keep</mc:Choice>bc",
    );
    expect(stripFallbacks("a<mc:Fallback>never closed")).toBe("a");
  });

  it("stays fast on a part full of unclosed fallbacks", () => {
    const xml = "<mc:Fallback>x".repeat(200_000);
    const started = performance.now();
    stripFallbacks(xml);
    expect(performance.now() - started).toBeLessThan(500);
  });
});

describe("countPictures", () => {
  it("counts one picture per placement, even with an SVG and its PNG fallback", () => {
    const svgPicture =
      '<pic:pic><a:blip r:embed="rId1"><a:extLst><a:ext><asvg:svgBlip r:embed="rId2"/></a:ext></a:extLst></a:blip></pic:pic>';
    const vmlCopy = '<mc:Fallback><v:imagedata r:id="rId1"/></mc:Fallback>';
    expect(countPictures(`<w:body>${svgPicture}${vmlCopy}<v:imagedata r:id="rId3"/></w:body>`)).toBe(2);
  });
});

describe("hasMultipleColumns", () => {
  it("reads the section's column count", () => {
    expect(hasMultipleColumns(`<w:sectPr><w:cols w:space="720" w:num="2"/></w:sectPr>`)).toBe(true);
    expect(hasMultipleColumns(`<w:sectPr><w:cols w:num="1"/></w:sectPr>`)).toBe(false);
    expect(hasMultipleColumns(`<w:sectPr><w:cols w:space="720"/></w:sectPr>`)).toBe(false);
  });
});

describe("partText", () => {
  it("returns visible text only, with entities decoded", () => {
    const xml =
      `<w:hdr xmlns:w="${W}"><w:p><w:r><w:t>Jane &amp; Co</w:t></w:r><w:r><w:tab/></w:r><w:r><w:t>jane@example.com</w:t></w:r></w:p>` +
      `<w:p><w:r><w:instrText> PAGE </w:instrText></w:r><w:r><w:delText>old</w:delText></w:r><w:r><w:t>&#8212; &lt;b&gt;</w:t></w:r></w:p></w:hdr>`;
    expect(partText(xml)).toBe("Jane & Co jane@example.com — <b>");
  });

  it("decodes numeric and named entities and leaves invalid ones alone", () => {
    expect(decodeXmlEntities("&quot;A&apos; &#x1F4DE; &#99999999; &bogus;")).toBe(`"A' 📞 &#99999999; &bogus;`);
  });
});

describe("lineBreaksAsText", () => {
  it("turns soft breaks into newline runs", () => {
    expect(lineBreaksAsText(`<w:r><w:t>A</w:t><w:br/><w:t>B</w:t><w:cr></w:cr></w:r>`)).toBe(
      `<w:r><w:t>A</w:t><w:t xml:space="preserve">&#10;</w:t><w:t>B</w:t><w:t xml:space="preserve">&#10;</w:t></w:r>`,
    );
  });
});

describe("hasBrokenTags", () => {
  it("passes well-formed XML, including the parts that may hold < and >", () => {
    const xml =
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="${W}">` +
      `<!-- a <comment> --><w:body><w:p w:rsidR="00A1" a="x>y"><w:r><w:t>1 > 0 &amp; 2 &lt; 3</w:t></w:r></w:p>` +
      `<w:sdt><![CDATA[a < b]]></w:sdt><w:p/></w:body></w:document>`;
    expect(hasBrokenTags(xml)).toBe(false);
    expect(hasBrokenTags("")).toBe(false);
    expect(hasBrokenTags("plain text")).toBe(false);
  });

  it.each([
    ["an unclosed tag before another", "<w:p><w:br <w:t>x</w:t></w:p>"],
    ["a tag that never closes", "<w:p><w:br "],
    ["a bare < in text", "<w:t>a < b</w:t>"],
    ["an empty tag", "<w:p><></w:p>"],
    ["an unclosed comment", "<w:p><!-- never closed"],
    ["an unclosed CDATA section", "<w:p><![CDATA[ never closed"],
    ["an unclosed declaration", '<?xml version="1.0"'],
    ["a doctype with an internal subset", '<!DOCTYPE x [<!ENTITY a "b">]><x/>'],
  ])("flags %s", (_name, xml) => {
    expect(hasBrokenTags(xml)).toBe(true);
  });
});

describe("parts full of unclosed tags", () => {
  // About 1.8 MB, just under the 2 MiB part cap. Each pattern used to scan ahead and back from every
  // "<", which took seconds (bounded repeats) or hours (the unbounded tag strip in partText) here.
  const unclosed = (name: string) => `<w:${name} `.repeat(Math.floor(1_800_000 / (name.length + 4)));

  function elapsed(run: () => unknown): number {
    const started = performance.now();
    run();
    return performance.now() - started;
  }

  it("reads soft breaks in linear time", () => {
    expect(elapsed(() => lineBreaksAsText(unclosed("br")))).toBeLessThan(500);
  });

  it("reads header text in linear time", () => {
    expect(elapsed(() => partText(unclosed("br")))).toBeLessThan(500);
    expect(elapsed(() => partText(unclosed("instrText")))).toBeLessThan(500);
  });

  it("reads the column count in linear time", () => {
    expect(elapsed(() => hasMultipleColumns(unclosed("cols")))).toBeLessThan(500);
  });

  it("finds broken tags in linear time", () => {
    expect(elapsed(() => expect(hasBrokenTags(unclosed("br"))).toBe(true))).toBeLessThan(500);
    const fine = `<w:p><w:r><w:t>Line</w:t></w:r></w:p>`.repeat(50_000);
    expect(elapsed(() => expect(hasBrokenTags(fine)).toBe(false))).toBeLessThan(500);
  });

  it("still reads well-formed tags the same way", () => {
    expect(partText(`<w:p><w:r><w:t>A</w:t><w:br w:type="line"/><w:t>B</w:t></w:r></w:p>`)).toBe("A B");
    expect(hasMultipleColumns(`<w:cols w:equalWidth="1" w:space="720" w:num="3"></w:cols>`)).toBe(true);
    expect(lineBreaksAsText(`<w:br w:type="line"/>`)).toBe(`<w:t xml:space="preserve">&#10;</w:t>`);
  });
});

describe("declaredPageCount", () => {
  it("reads docProps/app.xml", () => {
    expect(declaredPageCount("<Properties><Pages>3</Pages></Properties>")).toBe(3);
    expect(declaredPageCount("<Properties><Pages>0</Pages></Properties>")).toBeNull();
    expect(declaredPageCount("")).toBeNull();
  });
});
