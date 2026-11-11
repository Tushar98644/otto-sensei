import { extractText, getDocumentProxy } from "unpdf";
import { describe, expect, it } from "vitest";
import { emptyResume, newBullet, newExperience, type Resume } from "@/lib/resume/schema";
import { renderLetterPdf, renderResumePdf } from "./render";

function resume(): Resume {
  return {
    ...emptyResume(0),
    basics: { name: "Ana Souza", headline: "", email: "ana@example.com", phone: "", location: "Lisbon, Portugal", links: [] },
    experience: [
      { ...newExperience(), title: "Data Analyst", company: "Feedzai", bullets: [newBullet("Built fraud dashboards used by 30 banks.")] },
    ],
  };
}

describe("renderResumePdf", () => {
  it("returns a PDF blob whose text reads back", async () => {
    const blob = await renderResumePdf(resume(), { pageSize: "A4" });
    expect(blob.type).toBe("application/pdf");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");

    const pdf = await getDocumentProxy(bytes);
    try {
      const { text } = await extractText(pdf, { mergePages: true });
      expect(text.replace(/\s+/g, " ")).toContain("Feedzai Data Analyst");
      const page = await pdf.getPage(1);
      expect(page.view.map(Math.round)).toEqual([0, 0, 595, 842]);
    } finally {
      await pdf.loadingTask.destroy();
    }
  });

  it("defaults to Letter", async () => {
    const pdf = await getDocumentProxy(new Uint8Array(await (await renderResumePdf(resume())).arrayBuffer()));
    try {
      expect((await pdf.getPage(1)).view.map(Math.round)).toEqual([0, 0, 612, 792]);
    } finally {
      await pdf.loadingTask.destroy();
    }
  });
});

describe("renderLetterPdf", () => {
  it("draws the letter under the resume's own name block, with the date and every paragraph", async () => {
    const letter = "Dear Kestrel Labs team,\n\nI built fraud dashboards used by 30 banks.\n\nBest regards,\nAna Souza";
    const blob = await renderLetterPdf({ ...resume(), template: "executive" }, letter, {
      pageSize: "A4",
      now: Date.UTC(2026, 10, 7, 12),
    });
    const pdf = await getDocumentProxy(new Uint8Array(await blob.arrayBuffer()));
    try {
      const { text } = await extractText(pdf, { mergePages: true });
      const flat = text.replace(/\s+/g, " ");
      for (const part of ["Ana Souza", "ana@example.com", "7 November 2026", "Dear Kestrel Labs team,", "used by 30 banks.", "Best regards,"]) {
        expect(flat).toContain(part);
      }
      expect(pdf.numPages).toBe(1);
      expect((await pdf.getPage(1)).view.map(Math.round)).toEqual([0, 0, 595, 842]);
    } finally {
      await pdf.loadingTask.destroy();
    }
  });
});
