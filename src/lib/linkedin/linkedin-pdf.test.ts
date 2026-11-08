import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { runRecruiterChecks } from "@/lib/checks/recruiter";
import { extractDocument } from "@/lib/parse";
import { cleanResumePdf } from "@/lib/parse/test-fixtures";
import { heuristicParse } from "@/lib/resume/heuristic-parse";
import { linkedInProfileText } from "./profile-pdf";

// LinkedIn's "More → Save to PDF" profile: a gray sidebar (contact, top skills, languages,
// certifications) beside the main column (name, headline, summary, experience with a duration in
// brackets on each date line, education), and "Page N of M" footers.

type Pen = { page: PDFPage; regular: PDFFont; bold: PDFFont };

function writer({ page, regular, bold }: Pen, x: number, startY: number) {
  let y = startY;
  return (text: string, { size = 10, heading = false, gap = 14 }: { size?: number; heading?: boolean; gap?: number } = {}) => {
    page.drawText(text, { x, y, size, font: heading ? bold : regular, color: rgb(0.1, 0.1, 0.1) });
    y -= gap;
  };
}

async function linkedInProfilePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const first = doc.addPage([612, 792]);
  first.drawRectangle({ x: 0, y: 0, width: 200, height: 792, color: rgb(0.93, 0.94, 0.95) });
  const side = writer({ page: first, regular, bold }, 24, 740);
  side("Contact", { size: 13, heading: true, gap: 18 });
  side("ana.souza@example.com");
  side("www.linkedin.com/in/anasouza", { gap: 12 });
  side("(LinkedIn)", { gap: 24 });
  side("Top Skills", { size: 13, heading: true, gap: 18 });
  side("Figma");
  side("User Research");
  side("Prototyping", { gap: 24 });
  side("Languages", { size: 13, heading: true, gap: 18 });
  side("Portuguese (Native or Bilingual)");
  side("English (Full Professional)", { gap: 24 });
  side("Certifications", { size: 13, heading: true, gap: 18 });
  side("Google UX Design");

  const main = writer({ page: first, regular, bold }, 230, 740);
  main("Ana Souza", { size: 26, gap: 24 });
  main("Senior Product Designer at Contoso", { size: 12, gap: 16 });
  main("Lisbon, Lisbon, Portugal", { gap: 28 });
  main("Summary", { size: 15, heading: true, gap: 20 });
  main("I design calm money apps for people who hate spreadsheets.", { gap: 28 });
  main("Experience", { size: 15, heading: true, gap: 20 });
  main("Contoso", { size: 12, heading: true, gap: 16 });
  main("Senior Product Designer");
  main("March 2022 - Present (2 years 9 months)");
  main("Lisbon, Portugal");
  main("Led the redesign of the payments flow.");
  main("Cut checkout steps from 5 to 3.", { gap: 24 });
  main("Fabrikam", { size: 12, heading: true, gap: 16 });
  main("Product Designer");
  main("January 2019 - February 2022 (3 years 2 months)");
  main("Remote");
  main("Designed onboarding for 2 apps.");
  first.drawText("Page 1 of 2", { x: 280, y: 30, size: 9, font: regular, color: rgb(0.5, 0.5, 0.5) });

  const second = doc.addPage([612, 792]);
  const rest = writer({ page: second, regular, bold }, 230, 740);
  rest("Education", { size: 15, heading: true, gap: 20 });
  rest("University of Porto", { size: 12, heading: true, gap: 16 });
  rest("Bachelor of Arts - BA, Communication Design · (2014 - 2018)");
  second.drawText("Page 2 of 2", { x: 280, y: 30, size: 9, font: regular, color: rgb(0.5, 0.5, 0.5) });
  return doc.save();
}

describe("LinkedIn 'Save to PDF' profile through the PDF import", () => {
  it("reads contact, jobs and school without the AI", async () => {
    const extraction = await extractDocument(await linkedInProfilePdf(), "Profile.pdf");
    expect(extraction.signals.hasTextLayer).toBe(true);
    const text = linkedInProfileText(extraction);
    expect(text).not.toBeNull();
    const resume = heuristicParse(text ?? "", Date.UTC(2026, 10, 7));

    expect(resume.basics.name).toBe("Ana Souza");
    expect(resume.basics.email).toBe("ana.souza@example.com");
    expect(resume.summary).toContain("calm money apps");

    const companies = resume.experience.map((job) => job.company);
    expect(companies).toEqual(expect.arrayContaining(["Contoso", "Fabrikam"]));
    const contoso = resume.experience.find((job) => job.company === "Contoso");
    expect(contoso?.title).toBe("Senior Product Designer");
    expect(contoso?.bullets.map((b) => b.text).join(" ")).toContain("payments flow");

    expect(resume.education[0]?.school).toBe("University of Porto");
    // Footers are page furniture, not resume content.
    expect(JSON.stringify(resume)).not.toMatch(/Page \d of \d/);
  });

  it("leaves every other PDF to the normal reading order", async () => {
    expect(linkedInProfileText(await extractDocument(await cleanResumePdf(), "resume.pdf"))).toBeNull();
  });

  it("gets a recruiter report for the sidebar layout", async () => {
    const extraction = await extractDocument(await linkedInProfilePdf(), "Profile.pdf");
    const report = runRecruiterChecks(extraction, Date.UTC(2026, 10, 7));
    expect(report.checks.length).toBeGreaterThan(0);
  });
});
