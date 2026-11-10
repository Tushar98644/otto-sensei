import { describe, expect, it } from "vitest";
import { buildPdfModel } from "@/lib/pdf/model";
import { TEMPLATE_IDS, type Resume, type ResumeDesign, type TemplateId } from "@/lib/resume/schema";
import { entryRows } from "./layout";
import { readPages, render, sampleResume } from "./test-fixtures";
import { TEMPLATE_THEMES, themeFor } from "./themes";

// What hiring software gets from each format's PDF, read back with pdf.js: every line top to
// bottom in the order the plan prints it, every character as typed (accents included), and nothing
// it would trip on (icon names, junk glyphs, words split by letter spacing).

const ACCENTED = "Boğaziçi Łódź Nguyễn Ångström Øre";

const DESIGNS: ResumeDesign[] = [{}, { font: "sans" }, { font: "serif" }, { density: "compact" }];

const lower = (text: string) => text.replace(/\s+/g, " ").toLocaleLowerCase();

// The next occurrence of each part, in order, case-insensitively (some formats print capitals).
function expectInReadingOrder(text: string, parts: readonly string[]) {
  const flat = lower(text);
  let from = 0;
  for (const part of parts) {
    const at = flat.indexOf(lower(part), from);
    expect(
      at,
      `"${part}" should come after ${JSON.stringify(flat.slice(Math.max(0, from - 40), from))}`,
    ).toBeGreaterThanOrEqual(0);
    from = at + lower(part).length;
  }
}

// Everything the page should print, in order, from the plan the renderers share.
function plannedOrder(resume: Resume, template: TemplateId): string[] {
  const theme = themeFor(resume, template);
  const model = buildPdfModel(resume);
  const parts = [model.name, model.headline];
  for (const line of theme.contactLines) {
    for (const field of line) {
      const basics = model.basics!;
      if (field === "links") parts.push(...basics.links.map((link) => link.text));
      else if (basics[field]) parts.push(basics[field]!.text);
    }
  }
  for (const section of model.sections) {
    parts.push(section.title);
    if (section.key === "summary") parts.push(...section.paragraphs);
    else if (section.key === "skills") {
      parts.push(...section.lines.map((line) => `${line.label}: ${line.items}`));
    } else {
      const kind =
        section.key === "experience" ? "job" : section.key === "education" ? "school" : "item";
      for (const entry of section.entries) {
        for (const row of entryRows(entry, kind, theme)) {
          parts.push(row.lead.map((run) => run.text).join(""));
          if (row.side) parts.push(row.side.text);
        }
        parts.push(...entry.bullets.map((bullet) => bullet.text));
      }
    }
  }
  return parts.filter(Boolean);
}

function characterProblems(text: string): string[] {
  const problems: string[] = [];
  // Junk a missing glyph or an icon font leaves: replacement marks, private use, controls, emoji.
  for (const char of text) {
    if (/[�\p{Co}\p{Cc}\p{Extended_Pictographic}]/u.test(char) && char !== "\n") {
      problems.push(`junk ${JSON.stringify(char)}`);
    }
  }
  // Icon fonts read back as their names ("HOUSE-CHIMNEY", "GITHUB-SQUARE").
  for (const match of text.matchAll(/\b[A-Z]{3,}(?:-[A-Z]+)+\b/g))
    problems.push(`icon ${match[0]}`);
  // Letter spacing past ~8% of the type size reads back as "S U M M A R Y".
  for (const match of text.matchAll(/(?:^|\s)(?:\p{L} ){3,}\p{L}(?=\s|$)/gu)) {
    problems.push(`spaced ${match[0].trim()}`);
  }
  return problems;
}

describe.each(TEMPLATE_IDS)("%s format, as hiring software reads it", (template) => {
  it.each(DESIGNS.map((design) => [JSON.stringify(design), design] as const))(
    "reads top to bottom in the planned order with clean text (look %s)",
    async (_label, design) => {
      const resume: Resume = { ...sampleResume(), template, design };
      const pages = await readPages(await render(resume));
      expect(pages).toHaveLength(1);
      const text = pages.join("\n");
      expectInReadingOrder(text, plannedOrder(resume, template));
      expect(characterProblems(text)).toEqual([]);
      // Each heading is a line of its own.
      const lines = new Set(text.split("\n").map((line) => line.trim().toLocaleLowerCase()));
      for (const heading of ["summary", "experience", "projects", "education", "skills"]) {
        expect(lines.has(heading), heading).toBe(true);
      }
    },
  );

  it("prints accented names and places exactly as typed, in every look", async () => {
    for (const design of DESIGNS) {
      const resume = sampleResume();
      resume.template = template;
      resume.design = design;
      resume.basics.name = ACCENTED;
      resume.basics.location = "Łódź, Poland";
      resume.experience[0] = {
        ...resume.experience[0]!,
        company: "Boğaziçi Ventures",
        title: "Nguyễn Ångström Øre Lead",
      };
      resume.experience[0]!.bullets[0] = { id: "b1", text: `Hosted ${ACCENTED} at the summit.` };
      // Latvian letters CMU Serif Bold lacks, drawn by the fallback font.
      resume.education[0] = { ...resume.education[0]!, school: "Ķemeri Ģimnāzija" };
      const model = buildPdfModel(resume);
      expect(model.changedCharacters).toEqual([]);
      const text = lower((await readPages(await render(resume))).join("\n"));
      for (const part of [
        ACCENTED,
        "Łódź, Poland",
        "Boğaziçi Ventures",
        "Nguyễn Ångström Øre Lead",
        `Hosted ${ACCENTED} at the summit.`,
        "Ķemeri Ģimnāzija",
      ]) {
        expect(text, `${part} in ${JSON.stringify(design)}`).toContain(lower(part));
      }
    }
  });

  it("embeds its own fonts, never a built-in PDF font", async () => {
    const bytes = await render({ ...sampleResume(), template });
    const raw = new TextDecoder("latin1").decode(bytes);
    const fonts = [...raw.matchAll(/\/BaseFont\s*\/([A-Za-z+-]+)/g)].map((match) => match[1]!);
    expect(fonts.length).toBeGreaterThan(0);
    for (const font of fonts) expect(font).not.toMatch(/^(Helvetica|Times|Courier)/);
  });
});

describe("embedded fonts", () => {
  it("keep every character readable in a PDF made after one with composite letters", async () => {
    // "Å" and "ź" are drawn from the plain "A" and "z" glyphs; those must still read back as letters
    // in the next file, which reuses the loaded fonts.
    for (const template of TEMPLATE_IDS) {
      const accented = sampleResume();
      accented.template = template;
      accented.experience[1] = { ...accented.experience[1]!, company: "Ångström Łódź Ąžuolas" };
      await render(accented);
      const plain = { ...sampleResume(), template };
      plain.experience[1] = { ...plain.experience[1]!, company: "Amazon Zebra Azure" };
      const text = (await readPages(await render(plain))).join("\n");
      expect(text, template).toContain("Amazon Zebra Azure");
    }
  });
});

describe("square bullets", () => {
  it("print as a glyph where the font has one and as a drawn mark where it doesn't", async () => {
    const tinos = await readPages(await render({ ...sampleResume(), template: "compact" }));
    expect(tinos.join("\n")).toContain("■ Cut checkout latency 38%");
    // Carlito has no "■": the mark is drawn, so the text has none (and no stand-in from Helvetica).
    const carlito = {
      ...sampleResume(),
      template: "compact" as const,
      design: { font: "sans" as const },
    };
    expect(TEMPLATE_THEMES.compact.bullet.shape).toBe("square");
    expect(themeFor(carlito).drawBullet).toBe(true);
    const text = (await readPages(await render(carlito))).join("\n");
    expect(text).not.toContain("■");
    expect(text).toContain("Cut checkout latency 38%");
  });
});
