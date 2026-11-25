import { describe, expect, it } from "vitest";
import {
  EXTRA_KINDS,
  MAX_EXTRA_ITEMS,
  MAX_EXTRA_SECTIONS,
  emptyResume,
  extrasOf,
  newBullet,
  newExtraItem,
  newExtraSection,
  type ExtraItem,
  type ExtraSection,
  type Resume,
} from "@/lib/resume/schema";
import { ResumeSchema } from "@/lib/resume/validation";
import { setHidden } from "./edits";
import { EN, EN_FORMAT } from "../testing";
import {
  extraForms,
  appendExtraItem,
  appendExtraSection,
  defaultExtraTitle,
  editExtraItems,
  extraCount,
  extraItemHeading,
  hasItemContent,
  moveExtraSection,
  patchExtraSection,
  removeExtraSection,
  removeItemQuestion,
  removeSectionQuestion,
  renameExtraSection,
} from "./extras";

const fits = (resume: Resume) => ResumeSchema.safeParse(resume).success;

function item(patch: Partial<ExtraItem> = {}): ExtraItem {
  return { ...newExtraItem(), ...patch };
}

const EXTRA_FORMS = extraForms(EN.studioSections.extras);

function withSections(...sections: ExtraSection[]): Resume {
  return { ...emptyResume(0), extras: sections };
}

describe("extra section copy", () => {
  it("has a form, a description and a starting title for every kind", () => {
    for (const kind of EXTRA_KINDS) {
      expect(EXTRA_FORMS[kind].addLabel).not.toBe("");
      expect(EN.studioSections.extras.kinds[kind].description).not.toBe("");
      expect(defaultExtraTitle(kind)).toBe(newExtraSection(kind).title);
    }
    expect(defaultExtraTitle("languages")).toBe("Languages");
    expect(defaultExtraTitle("custom")).toBe("Additional information");
  });
});

describe("adding and removing extra sections", () => {
  it("adds a section to a resume saved before extras existed", () => {
    const old: Resume = { ...emptyResume(0), extras: undefined };
    const section = newExtraSection("awards");
    const next = appendExtraSection(old, section);
    expect(extrasOf(next)).toEqual([section]);
    expect(fits(next)).toBe(true);
  });

  it("stops at the most sections the schema takes", () => {
    const full = withSections(
      ...Array.from({ length: MAX_EXTRA_SECTIONS }, () => newExtraSection("custom")),
    );
    expect(fits(full)).toBe(true);
    expect(appendExtraSection(full, newExtraSection("languages"))).toBe(full);
  });

  it("moves and removes a section and keeps the others as they were", () => {
    const languages = newExtraSection("languages");
    const awards = newExtraSection("awards");
    const resume = withSections(languages, awards);

    const moved = moveExtraSection(resume, awards.id, -1);
    expect(extrasOf(moved)).toEqual([awards, languages]);
    expect(extrasOf(moved)[0]).toBe(awards);
    expect(moveExtraSection(resume, languages.id, -1)).toBe(resume);

    const removed = removeExtraSection(resume, languages.id);
    expect(extrasOf(removed)).toEqual([awards]);
    expect(extrasOf(removed)[0]).toBe(awards);
    expect(removeExtraSection(resume, "missing")).toBe(resume);
  });

  it("hides a whole section without touching its items", () => {
    const section = {
      ...newExtraSection("publications"),
      items: [item({ title: "Calm dashboards" })],
    };
    const resume = withSections(section);
    const hidden = patchExtraSection(resume, section.id, (current) => setHidden(current, true));
    expect(extrasOf(hidden)[0]?.hidden).toBe(true);
    expect(extrasOf(hidden)[0]?.items).toBe(section.items);
    const shown = patchExtraSection(hidden, section.id, (current) => setHidden(current, false));
    expect(extrasOf(shown)[0]?.hidden).toBeUndefined();
    expect(fits(shown)).toBe(true);
  });
});

describe("renameExtraSection", () => {
  const section = newExtraSection("custom");
  const resume = withSections(section);

  it("tidies the typed title onto one line", () => {
    const next = renameExtraSection(resume, section.id, "  Interests \n and   hobbies ");
    expect(extrasOf(next)[0]?.title).toBe("Interests and hobbies");
  });

  it("goes back to the kind's heading when cleared", () => {
    const named = renameExtraSection(resume, section.id, "Interests");
    const cleared = renameExtraSection(named, section.id, "   ");
    expect(extrasOf(cleared)[0]?.title).toBe("Additional information");
  });

  it("returns the same resume when nothing changed", () => {
    expect(renameExtraSection(resume, section.id, section.title)).toBe(resume);
    expect(renameExtraSection(resume, "missing", "Interests")).toBe(resume);
  });

  it("stays within the schema's cap", () => {
    const next = renameExtraSection(resume, section.id, "x".repeat(500));
    expect(fits(next)).toBe(true);
  });
});

describe("extra items", () => {
  it("adds items up to the cap and leaves other sections alone", () => {
    const awards = { ...newExtraSection("awards"), items: [] };
    const languages = newExtraSection("languages");
    const resume = withSections(awards, languages);
    const added = item({ title: "Hackathon winner" });

    const next = appendExtraItem(resume, awards.id, added);
    expect(extrasOf(next)[0]?.items).toEqual([added]);
    expect(extrasOf(next)[1]).toBe(languages);

    const full = withSections({
      ...awards,
      items: Array.from({ length: MAX_EXTRA_ITEMS }, () => item()),
    });
    expect(fits(full)).toBe(true);
    expect(appendExtraItem(full, awards.id, item())).toBe(full);
  });

  it("returns the same resume when the edit changes nothing", () => {
    const section = newExtraSection("awards");
    const resume = withSections(section);
    expect(editExtraItems(resume, section.id, (items) => items)).toBe(resume);
  });

  it("knows when an item holds something worth asking about", () => {
    expect(hasItemContent(item())).toBe(false);
    expect(hasItemContent(item({ bullets: [newBullet("  ")] }))).toBe(false);
    expect(hasItemContent(item({ date: "2021" }))).toBe(true);
    expect(hasItemContent(item({ bullets: [newBullet("Ran a weekly code club")] }))).toBe(true);
  });

  it("names an item by its title, else a short piece of its detail", () => {
    const form = EXTRA_FORMS.awards;
    expect(extraItemHeading(item({ title: " Analyst of the year " }), form)).toBe(
      "Analyst of the year",
    );
    expect(extraItemHeading(item({ detail: "Chosen from 300 staff" }), form)).toBe(
      "Chosen from 300 staff",
    );
    const long = extraItemHeading(item({ detail: "word ".repeat(30) }), form);
    expect(long.length).toBeLessThanOrEqual(58);
    expect(long.endsWith("…")).toBe(true);
    expect(extraItemHeading(item(), EXTRA_FORMS.languages)).toBe("New language");
  });

  it("asks before removing only what has content", () => {
    const form = EXTRA_FORMS.volunteering;
    expect(removeItemQuestion(item(), form, EN_FORMAT)).toBeNull();
    expect(removeItemQuestion(item({ title: "Mentor" }), form, EN_FORMAT)).toBe("Remove this role?");
    const withLines = item({
      title: "Mentor",
      bullets: [newBullet("Taught 12 kids"), newBullet("")],
    });
    expect(removeItemQuestion(withLines, form, EN_FORMAT)).toBe("Remove this role and its 1 line?");
  });
});

describe("removeSectionQuestion", () => {
  it("asks only when some item has content, and counts those", () => {
    const empty = newExtraSection("languages");
    expect(removeSectionQuestion(empty, EXTRA_FORMS, EN_FORMAT)).toBeNull();
    const filled = {
      ...empty,
      items: [item({ title: "Spanish" }), item({ title: "French" }), item()],
    };
    expect(removeSectionQuestion(filled, EXTRA_FORMS, EN_FORMAT)).toBe("Remove Languages and its 2 languages?");
  });
});

describe("extraCount", () => {
  it("counts items and says how many are hidden", () => {
    const section = newExtraSection("languages");
    expect(extraCount({ ...section, items: [] }, EN.studioSections.extras, EN_FORMAT)).toBe("None yet");
    expect(extraCount({ ...section, items: [item(), item()] }, EN.studioSections.extras, EN_FORMAT)).toBe("2 languages");
    expect(extraCount({ ...section, items: [item(), item({ hidden: true })] }, EN.studioSections.extras, EN_FORMAT)).toBe(
      "2 languages · 1 hidden",
    );
  });
});
