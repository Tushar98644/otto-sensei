import { describe, expect, it } from "vitest";
import { jsonLdScript } from "@/lib/seo/json-ld";
import { emptyContent, type PortfolioContent } from "./content";
import { contentView } from "./content-view";
import { jordanContent, jordanGitHub, jordanV2Resume } from "./fixtures/jordan";
import { profilePageJsonLd } from "./json-ld";
import { sampleResume } from "./testing";
import type { PortfolioTemplateId } from "./types";
import { portfolioView, type ViewSettings } from "./view";

const NOW = Date.UTC(2026, 10, 8);
const URL_ = "https://www.ottosensei.com/p/jordan-ellis";
const SHOW_ALL: ViewSettings = { showEmail: true, showPhone: true, hiddenSections: [] };

type Person = Record<string, unknown> & {
  sameAs?: string[];
  knowsAbout?: string[];
  worksFor?: { name: string }[];
  alumniOf?: { name: string }[];
};

function jsonLd({
  resume = jordanV2Resume(),
  settings = SHOW_ALL,
  content = jordanContent(),
  template = "cv",
}: {
  resume?: ReturnType<typeof jordanV2Resume>;
  settings?: ViewSettings;
  content?: PortfolioContent;
  template?: PortfolioTemplateId;
} = {}) {
  const view = portfolioView(resume, settings);
  const page = contentView({ view, content, github: jordanGitHub(), now: NOW });
  const data = profilePageJsonLd({ view, content: page, template, url: URL_, updatedAt: NOW });
  return { data, person: (data?.mainEntity ?? {}) as Person, text: JSON.stringify(data) };
}

describe("profilePageJsonLd", () => {
  it("is a ProfilePage about a Person, from what the page shows", () => {
    const { data, person } = jsonLd();
    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      url: URL_,
      dateModified: "2026-11-08T00:00:00.000Z",
    });
    expect(person).toMatchObject({
      "@type": "Person",
      name: "Jordan Ellis",
      url: URL_,
      jobTitle: "Full-stack engineer",
      address: { "@type": "PostalAddress", addressLocality: "Lisbon" },
    });
    expect(person.description).toMatch(/^I started out building agency sites in Manchester/);
    expect(person.worksFor).toEqual([{ "@type": "Organization", name: "Ledgerly" }]);
    expect(person.alumniOf).toContainEqual({
      "@type": "EducationalOrganization",
      name: "University of Manchester",
    });
    expect(person.knowsAbout).toEqual(expect.arrayContaining(["TypeScript", "PostgreSQL"]));
    expect(person.sameAs).toContain("https://github.com/jordanellis");
    for (const href of person.sameAs ?? []) expect(href).toMatch(/^https?:\/\//);
  });

  it("stays small: a short description and capped lists", () => {
    const { person } = jsonLd();
    expect(String(person.description).length).toBeLessThanOrEqual(300);
    expect(person.knowsAbout?.length).toBeLessThanOrEqual(40);
    expect(person.sameAs?.length).toBeLessThanOrEqual(12);
    expect(new Set(person.knowsAbout).size).toBe(person.knowsAbout?.length);
  });

  it("never carries the email or phone, even when the page shows them", () => {
    const { text } = jsonLd({ resume: sampleResume(), content: emptyContent() });
    expect(text).toContain("Maya Chen");
    expect(text).not.toContain("maya@example.com");
    expect(text).not.toContain("415 555 0100");
    expect(text).not.toContain("mailto:");
  });

  it("leaves out every section the owner hid", () => {
    const { person, text } = jsonLd({
      settings: {
        ...SHOW_ALL,
        hiddenSections: ["about", "experience", "skills", "education", "links"],
      },
      content: { ...jordanContent(), hidden: ["location"] },
    });
    expect(Object.keys(person).sort()).toEqual(["@type", "jobTitle", "name", "url"]);
    expect(text).not.toContain("Ledgerly");
    expect(text).not.toContain("University of Manchester");
    expect(text).not.toContain("Lisbon");
    expect(text).not.toContain("github.com");
  });

  it("keeps to what the design draws", () => {
    // Navy shows skills but no schools and no place; Prose shows neither skills nor schools.
    const navy = jsonLd({ template: "navy" }).person;
    expect(navy.knowsAbout).toBeDefined();
    expect(navy.alumniOf).toBeUndefined();
    expect(navy.address).toBeUndefined();
    const prose = jsonLd({ template: "prose" }).person;
    expect(prose.knowsAbout).toBeUndefined();
    expect(prose.alumniOf).toBeUndefined();
  });

  it("doesn't call Remote a place", () => {
    const resume = jordanV2Resume();
    const { person } = jsonLd({
      resume: { ...resume, basics: { ...resume.basics, location: "Remote" } },
      content: { ...jordanContent(), location: null },
    });
    expect(person.address).toBeUndefined();
  });

  it("is null for a page without a name", () => {
    const resume = jordanV2Resume();
    expect(jsonLd({ resume: { ...resume, basics: { ...resume.basics, name: "" } } }).data).toBeNull();
  });

  it("can't break out of its script tag through anything the owner typed", () => {
    const resume = jordanV2Resume();
    const { data } = jsonLd({
      resume: {
        ...resume,
        basics: { ...resume.basics, name: "Jo</script><script>alert(1)</script>" },
      },
    });
    const script = jsonLdScript(data!);
    expect(script).not.toMatch(/<\/script/i);
    expect(JSON.parse(script)).toEqual(data);
  });
});
