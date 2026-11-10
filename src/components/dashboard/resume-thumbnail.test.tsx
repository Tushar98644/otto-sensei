import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TEMPLATE_THEMES } from "@/components/pdf/themes";
import { createSampleResume } from "@/lib/resume/sample";
import { emptyResume, newBullet, type Resume } from "@/lib/resume/schema";
import { ownPage, ResumeThumbnail } from "./resume-thumbnail";
import { standInPage, standInText } from "./stand-in";

// Someone's own resume: their cards show every word of it; decorative art (standIn) shows none.
function realResume(): Resume {
  return {
    ...emptyResume(1),
    title: "Ada's resume",
    template: "executive",
    basics: {
      name: "Ada Quillfeather",
      headline: "Principal Ledger Architect",
      email: "ada.quillfeather@realmail.test",
      phone: "+1 202 555 0147",
      location: "Duluth, Minnesota",
      links: [{ id: "l1", label: "Site", url: "quillfeather.dev" }],
    },
    summary: "Zanzibar marmalade specialist with eleven quixotic years.",
    experience: [
      {
        id: "e1",
        company: "Quillworks Ltd",
        title: "Ledger Architect",
        location: "Duluth",
        startDate: "Feb 2015",
        endDate: "Present",
        bullets: [
          newBullet("Rebuilt the zephyr reconciliation engine for 41 vaults."),
          newBullet("Mentored 9 xylophonists."),
          newBullet("Cut audit time by 63% with the brass ledger."),
          { ...newBullet("Hidden line about the velvet archive."), hidden: true },
        ],
      },
    ],
    skills: [{ id: "s1", label: "Rare", items: ["Quillcraft", "Vaultkeeping"] }],
    sectionOrder: ["experience", "summary", "skills", "education", "projects", "certifications"],
  };
}

const markup = (resume: Resume, template?: Resume["template"], standIn = false) =>
  renderToStaticMarkup(<ResumeThumbnail resume={resume} template={template} standIn={standIn} />);

describe("ResumeThumbnail", () => {
  it("shows the person's own resume as the PDF prints it, hidden lines left out", () => {
    const html = markup(realResume());
    for (const own of ["Ada Quillfeather", "Quillworks Ltd", "zephyr", "Zanzibar", "Quillcraft"]) {
      expect(html, own).toContain(own);
    }
    expect(html).not.toContain("velvet archive");
    expect(html).not.toContain(createSampleResume(0).basics.name);
    expect(ownPage(emptyResume(1)).blank).toBe(true);
  });

  it("as decorative art, never shows the person's own name, contact details, companies or lines", () => {
    const html = markup(realResume(), undefined, true);
    for (const secret of [
      "Ada",
      "Quillfeather",
      "ada.quillfeather@realmail.test",
      "202 555 0147",
      "Duluth",
      "quillfeather.dev",
      "Ledger Architect",
      "Quillworks",
      "Feb 2015",
      "zephyr",
      "xylophonists",
      "brass ledger",
      "Zanzibar",
      "Quillcraft",
      "Rare",
    ]) {
      expect(html, secret).not.toContain(secret);
    }
  });

  it("as decorative art, draws the sample person with the resume's own sections, order and line counts", () => {
    const sample = createSampleResume(0);
    const html = markup(realResume(), undefined, true);
    expect(html).toContain(sample.basics.name);
    expect(html).toContain(sample.basics.email);
    // Experience first, as this resume orders it; sections it doesn't have stay out.
    const order = ["Experience", "Summary", "Skills"].map((title) => html.indexOf(`>${title}<`));
    expect(order.every((index) => index > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(html).not.toContain(">Education<");
    expect(html).not.toContain(">Projects<");
    // One job with 3 lines, drawn with the format's bullet glyph.
    const glyph = TEMPLATE_THEMES.executive.bullet.glyph;
    expect(html.split(`>${glyph}<`).length - 1).toBe(3);
  });

  it("keeps each line about as long as the real one", () => {
    const real = realResume();
    const [job] = standInPage(real).model.sections.flatMap((s) =>
      "entries" in s ? s.entries : [],
    );
    const lengths = job!.bullets.map((bullet) => bullet.text.length);
    const realLengths = real.experience[0]!.bullets.map((bullet) => bullet.text.length);
    lengths.forEach((length, index) => {
      expect(Math.abs(length - realLengths[index]!)).toBeLessThan(realLengths[index]! * 0.5 + 12);
    });
  });

  it("uses the resume's format, or the one asked for", () => {
    expect(markup(realResume())).toContain('data-format="executive"');
    expect(markup(realResume())).toContain("TeX Gyre Pagella");
    const developer = markup(realResume(), "developer");
    expect(developer).toContain('data-format="developer"');
    expect(developer).toContain("CMU Serif");
  });

  it("draws a placeholder page for a resume with nothing in it yet", () => {
    const blank = emptyResume(1);
    expect(standInPage(blank).blank).toBe(true);
    expect(markup(blank, undefined, true)).not.toContain(createSampleResume(0).basics.name);
  });
});

describe("standInText", () => {
  it("cuts sample lines to roughly the length asked for, starting at the line's own", () => {
    const lines = ["alpha beta gamma", "delta epsilon zeta eta"];
    expect(standInText(lines, 16, 0)).toBe("alpha beta gamma");
    expect(standInText(lines, 10, 1)).toBe("delta epsilon");
    const long = standInText(lines, 50, 0);
    expect(long.length).toBeGreaterThanOrEqual(50);
    expect(long.length).toBeLessThan(62);
    expect(long.startsWith("alpha beta gamma delta")).toBe(true);
    expect(standInText(lines, 0, 0)).toBe("");
    expect(standInText([], 20, 0)).toBe("");
  });

  it("draws the sample resume's own page word for word", () => {
    const sample = createSampleResume(0);
    const [job] = standInPage(sample).model.sections.flatMap((s) =>
      "entries" in s ? s.entries : [],
    );
    expect(job?.bullets.map((bullet) => bullet.text)).toEqual(
      sample.experience[0]!.bullets.map((bullet) => bullet.text),
    );
  });
});
