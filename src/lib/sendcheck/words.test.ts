import { describe, expect, it } from "vitest";
import { formatFor } from "@/i18n/intl";
import de from "@/i18n/messages/de/studio-download";
import en from "@/i18n/messages/en/studio-download";
import es from "@/i18n/messages/es/studio-download";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { runSendCheck } from "./index";

const NOW = Date.UTC(2026, 10, 7);

function resume(): Resume {
  const base = emptyResume(0);
  return {
    ...base,
    basics: { ...base.basics, name: "Maya Lindqvist", headline: "[Job title]" },
    summary: "Backend engineer who builds payment systems.",
    experience: [
      {
        id: "a",
        title: "Engineer",
        company: "Northwind",
        location: "",
        startDate: "Jan 2019",
        endDate: "Dec 2021",
        bullets: [{ id: "b1", text: "Built a ChatGPT helper for support" }],
      },
      {
        id: "b",
        title: "",
        company: "",
        location: "",
        startDate: "Mar 2021",
        endDate: "Jan 2020",
        bullets: [],
      },
      {
        id: "c",
        title: "Consultant",
        company: "Contoso",
        location: "",
        startDate: "Jun 2020",
        endDate: "May 2028",
        bullets: [],
      },
    ],
    certifications: [{ id: "x", name: "", issuer: "AWS", date: "2030" }],
  };
}

describe("send check words", () => {
  it("are the same in English with or without the messages", () => {
    const plain = runSendCheck(resume(), { now: NOW });
    expect(plain.map((item) => item.rule)).toEqual(
      expect.arrayContaining(["placeholder", "dates", "tool-dates"]),
    );
    expect(
      runSendCheck(resume(), { now: NOW, words: en.sendItems, format: formatFor("en") }),
    ).toEqual(plain);
  });

  it("read in Spanish and German, with the ids unchanged", () => {
    const plain = runSendCheck(resume(), { now: NOW });
    const spanish = runSendCheck(resume(), {
      now: NOW,
      words: es.sendItems,
      format: formatFor("es"),
    });
    expect(spanish.map((item) => item.id)).toEqual(plain.map((item) => item.id));
    const byTitle = new Map(spanish.map((item) => [item.title, item]));
    expect(byTitle.get("Quedó un espacio por llenar")?.place).toBe("Título profesional");
    expect(byTitle.get("Fechas al revés")?.place).toBe("Un trabajo");
    expect(byTitle.get("Mencionado antes de existir")?.message).toMatch(
      /^ChatGPT salió en nov\.? 2022, después de que terminó este trabajo \(Jan 2019 – Dec 2021\)\.$/,
    );
    const german = runSendCheck(resume(), { now: NOW, words: de.sendItems, format: formatFor("de") });
    const overlap = german.find((item) => item.title === "Daten überschneiden sich");
    expect(overlap?.message).toMatch(/^Überschneidet sich 1 Jahr und \d+ Monate? lang mit Engineer bei Northwind\./);
    expect(german.find((item) => item.place === "Ein Zertifikat")?.message).toContain("2030");
  });
});
