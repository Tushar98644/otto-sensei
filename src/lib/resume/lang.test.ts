import { describe, expect, it } from "vitest";
import { detectResumeLang, resumeLang, setResumeLang, withDetectedLang } from "./lang";
import { createSampleResume } from "./sample";
import { emptyResume, newBullet, newExperience, type Resume } from "./schema";
import { ResumeSchema } from "./validation";

function resumeOf(summary: string, lines: string[]): Resume {
  const job = { ...newExperience(), title: "", bullets: lines.map((text) => newBullet(text)) };
  return { ...emptyResume(0), summary, experience: [job] };
}

const GERMAN = resumeOf(
  "Backend-Entwicklerin mit Erfahrung in der Entwicklung von Zahlungssystemen für den Handel.",
  [
    "Leitung eines Teams von 5 Entwicklern und Abstimmung mit den Kunden",
    "Ladezeit der Seite durch Caching um 40 % verkürzt",
  ],
);

describe("resumeLang", () => {
  it("uses the language set on the resume", () => {
    expect(resumeLang({ ...GERMAN, lang: "fr" })).toBe("fr");
  });

  it("detects it from the resume's own words when none is set", () => {
    expect(resumeLang(GERMAN)).toBe("de");
    expect(detectResumeLang(GERMAN)).toMatchObject({ lang: "de" });
  });

  it("reads English for an English resume and for one with too little to go on", () => {
    expect(resumeLang(createSampleResume(0))).toBe("en");
    expect(resumeLang(emptyResume(0))).toBe("en");
    expect(resumeLang(resumeOf("", ["Led 3 hires"]))).toBe("en");
  });
});

describe("withDetectedLang", () => {
  it("records a language other than English", () => {
    expect(withDetectedLang(GERMAN).lang).toBe("de");
  });

  it("leaves English and unsure resumes exactly as they were", () => {
    const sample = createSampleResume(0);
    expect(withDetectedLang(sample)).toBe(sample);
    const blank = emptyResume(0);
    expect(withDetectedLang(blank)).toBe(blank);
  });

  it("never replaces a language the person picked", () => {
    const picked = { ...GERMAN, lang: "en" as const };
    expect(withDetectedLang(picked)).toBe(picked);
  });
});

describe("setResumeLang", () => {
  it("sets a language, or clears it to detect again", () => {
    const set = setResumeLang(GERMAN, "en");
    expect(set.lang).toBe("en");
    expect(resumeLang(set)).toBe("en");
    const cleared = setResumeLang(set, null);
    expect("lang" in cleared).toBe(false);
    expect(resumeLang(cleared)).toBe("de");
  });
});

describe("the lang field", () => {
  it("is optional, keeps a known language and drops anything else", () => {
    const base = emptyResume(0);
    expect(ResumeSchema.parse(base).lang).toBeUndefined();
    expect(ResumeSchema.parse({ ...base, lang: "pt" }).lang).toBe("pt");
    expect(ResumeSchema.parse({ ...base, lang: "pt-BR" }).lang).toBeUndefined();
    expect(ResumeSchema.parse({ ...base, lang: 7 }).lang).toBeUndefined();
  });
});
