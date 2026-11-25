import JSZip from "jszip";
import { getDocumentProxy } from "unpdf";
import { describe, expect, it } from "vitest";
import { buildLetterDocx, buildResumeDocx } from "@/lib/docx";
import {
  emptyResume,
  newBullet,
  newExperience,
  newExtraSection,
  TEMPLATE_IDS,
  type Resume,
} from "@/lib/resume/schema";
import { letterDate } from "./letter";
import { buildPdfModel } from "./model";
import { renderLetterPdf } from "./render";

const NOW = Date.UTC(2026, 10, 25, 12);

function resumeIn(lang: Resume["lang"], extra: Partial<Resume> = {}): Resume {
  const job = {
    ...newExperience(),
    title: "Backend-Entwickler",
    company: "Zahlwerk GmbH",
    startDate: "03/2021",
    endDate: "heute",
    bullets: [newBullet("Ladezeit der Seite durch Caching um 40 % verkürzt")],
  };
  return {
    ...emptyResume(0),
    basics: {
      ...emptyResume(0).basics,
      name: "Jonas Weber",
      email: "jonas@example.de",
      location: "Berlin",
    },
    summary: "Backend-Entwickler mit Erfahrung in Zahlungssystemen.",
    skills: [{ id: "s1", label: "", items: ["Go", "PostgreSQL"] }],
    experience: [job],
    extras: [
      {
        ...newExtraSection("languages"),
        items: [{ ...newExtraSection("languages").items[0]!, title: "Deutsch" }],
      },
    ],
    ...(lang ? { lang } : {}),
    ...extra,
  };
}

const titles = (resume: Resume) => {
  const model = buildPdfModel(resume);
  return [
    ...model.sections.map((section) => section.title),
    ...(model.extras ?? []).map((x) => x.title),
  ];
};

describe("headings in the resume's language", () => {
  it("prints default headings in the resume's language", () => {
    expect(titles(resumeIn("de"))).toEqual(["Profil", "Berufserfahrung", "Kenntnisse", "Sprachen"]);
    expect(titles(resumeIn("es"))).toEqual(["Perfil", "Experiencia", "Habilidades", "Idiomas"]);
    expect(titles(resumeIn("fr"))).toEqual(["Profil", "Expérience", "Compétences", "Langues"]);
    expect(titles(resumeIn("pt"))).toEqual(["Resumo", "Experiência", "Habilidades", "Idiomas"]);
  });

  it("reads the language from the text when the resume has none", () => {
    expect(titles(resumeIn(undefined))).toEqual([
      "Profil",
      "Berufserfahrung",
      "Kenntnisse",
      "Sprachen",
    ]);
  });

  it("keeps the person's own headings, and English defaults stay English for an English resume", () => {
    const own = resumeIn("de", { sectionTitles: { experience: "Stationen", skills: "Skills" } });
    expect(titles(own)).toEqual(["Profil", "Stationen", "Kenntnisse", "Sprachen"]);
    expect(titles(resumeIn("en"))).toEqual(["Summary", "Experience", "Skills", "Languages"]);
  });

  it("sets the document's language and title", () => {
    const model = buildPdfModel(resumeIn("de"));
    expect(model.lang).toBe("de");
    expect(model.meta.title).toBe("Jonas Weber - Lebenslauf");
    expect(buildPdfModel(resumeIn("en")).meta.title).toBe("Jonas Weber - Resume");
  });
});

describe("letter dates", () => {
  it("writes the date each language's way, and English by page size as before", () => {
    expect(letterDate(NOW, "A4", "de")).toBe("25. November 2026");
    expect(letterDate(NOW, "A4", "fr")).toBe("25 novembre 2026");
    expect(letterDate(NOW, "LETTER", "es")).toBe("25 de noviembre de 2026");
    expect(letterDate(NOW, "A4", "pt")).toBe("25 de novembro de 2026");
    expect(letterDate(NOW, "LETTER")).toBe("November 25, 2026");
    expect(letterDate(NOW, "A4", "en")).toBe("25 November 2026");
  });
});

describe("Word files", () => {
  it("tags the text with the resume's language", async () => {
    const styles = async (bytes: Uint8Array) =>
      (await JSZip.loadAsync(bytes)).file("word/styles.xml")!.async("string");
    expect(await styles(await buildResumeDocx(resumeIn("de"), { now: NOW }))).toContain(
      '<w:lang w:val="de-DE"/>',
    );
    expect(await styles(await buildResumeDocx(resumeIn("en"), { now: NOW }))).toContain(
      '<w:lang w:val="en-US"/>',
    );
  });

  it("titles and dates a letter in the letter's language", async () => {
    const letter =
      "Sehr geehrtes Team von Kestrel Labs,\n\nIch habe die Abrechnung bei Zahlwerk neu aufgebaut und die Ladezeit der Seiten um 40 % verkürzt.\n\nMit freundlichen Grüßen\nJonas Weber";
    const zip = await JSZip.loadAsync(
      await buildLetterDocx(resumeIn("de"), letter, { pageSize: "A4", now: NOW }),
    );
    expect(await zip.file("docProps/core.xml")!.async("string")).toContain(
      "<dc:title>Jonas Weber - Anschreiben</dc:title>",
    );
    expect(await zip.file("word/document.xml")!.async("string")).toContain("25. November 2026");
  });
});

// German runs about 30% longer than English: the longest letter Otto writes still fits one page.
describe("a long German letter", () => {
  const sentence =
    "Bei der Zahlwerk GmbH habe ich die Abrechnungsplattform für Geschäftskunden neu aufgebaut und die durchschnittliche Ladezeit der wichtigsten Kundenseiten um vierzig Prozent verkürzt.";
  const paragraph = Array.from({ length: 4 }, () => sentence).join(" ");
  const letter = [
    "Sehr geehrtes Team von Kestrel Labs,",
    paragraph,
    paragraph,
    paragraph,
    "Mit freundlichen Grüßen\nJonas Weber",
  ].join("\n\n");

  it("has the most words a letter body can", () => {
    expect(paragraph.split(/\s+/).length * 3).toBeGreaterThanOrEqual(250);
  });

  it.each(TEMPLATE_IDS)("fits one Letter page in the %s template", async (template) => {
    const blob = await renderLetterPdf({ ...resumeIn("de"), template }, letter, {
      pageSize: "LETTER",
      now: NOW,
    });
    const pdf = await getDocumentProxy(new Uint8Array(await blob.arrayBuffer()));
    try {
      expect(pdf.numPages).toBe(1);
    } finally {
      await pdf.loadingTask.destroy();
    }
  });
});
