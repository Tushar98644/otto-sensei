import { describe, expect, it } from "vitest";
import { buildPdfModel, type PdfEntry } from "@/lib/pdf/model";
import { DESIGN_ACCENTS, DESIGN_FONTS, TEMPLATE_IDS, type TemplateId } from "@/lib/resume/schema";
import { applyDesign } from "./design";
import { entryRows, headingRuns, nameRuns, splitName, yearsOnly, type PlannedRow } from "./layout";
import { sampleResume } from "./test-fixtures";
import { MAX_LETTER_SPACING, type TemplateTheme } from "./theme";
import { TEMPLATE_THEMES } from "./themes";

const text = (row: PlannedRow) => [row.lead.map((run) => run.text).join(""), row.side?.text ?? ""];

const job: PdfEntry = {
  id: "j1",
  title: "Senior Backend Engineer",
  org: "Northwind Payments",
  detail: { text: "Toronto, Canada", href: null },
  dates: "Jan 2021 – Present",
  bullets: [],
};

describe("splitName", () => {
  it("makes the last word the last name and never loses a character", () => {
    const cases: [string, string, string][] = [
      ["Jordan Ellis", "Jordan", "Ellis"],
      ["Mary Ann Lee", "Mary Ann", "Lee"],
      ["Martin Luther King Jr.", "Martin Luther", "King Jr."],
      ["Ludwig van Beethoven", "Ludwig", "van Beethoven"],
      ["Juan de la Cruz", "Juan", "de la Cruz"],
      ["Nguyễn Văn An", "Nguyễn Văn", "An"],
      // One word, a comma or no spaces: nothing to split, so the whole name takes the bold style.
      ["Cher", "", "Cher"],
      ["Park, Byungjin", "", "Park, Byungjin"],
      ["王芳", "", "王芳"],
      ["Jr. Smith", "Jr.", "Smith"],
    ];
    for (const [name, first, last] of cases) {
      expect(splitName(name), name).toEqual({ first, last });
      expect([first, last].filter(Boolean).join(" ")).toBe(name);
    }
  });

  it("prints the whole name, two-tone, then the inline headline", () => {
    const runs = nameRuns({ name: "Jordan Ellis", headline: "PM" }, TEMPLATE_THEMES.modern);
    expect(runs.map((run) => run.text).join("")).toBe("Jordan Ellis");
    expect(runs[1]!.style).toBe(TEMPLATE_THEMES.modern.styles.nameLast);
    const executive = nameRuns({ name: "Jordan Ellis", headline: "PM" }, TEMPLATE_THEMES.executive);
    expect(executive.map((run) => run.text).join("")).toBe("Jordan Ellis | PM");
  });
});

describe("yearsOnly", () => {
  it("keeps the years and anything without one", () => {
    expect(yearsOnly("Mar 2019 – Feb 2022")).toBe("2019 – 2022");
    expect(yearsOnly("Jan 2021 – Present")).toBe("2021 – Present");
    expect(yearsOnly("Jun 2020 – Dec 2020")).toBe("2020");
    expect(yearsOnly("2013 – 2017")).toBe("2013 – 2017");
    expect(yearsOnly("Summer '19")).toBe("Summer '19");
    expect(yearsOnly("2019-03 – now")).toBe("2019 – now");
  });
});

describe("headingRuns", () => {
  it("puts the first three letters in the accent for Modern and keeps the word whole", () => {
    const runs = headingRuns("Experience", TEMPLATE_THEMES.modern);
    expect(runs.map((run) => run.text)).toEqual(["Exp", "erience"]);
    expect(headingRuns("Øre", TEMPLATE_THEMES.modern).map((run) => run.text)).toEqual(["Øre"]);
    expect(headingRuns("Experience", TEMPLATE_THEMES.classic)).toEqual([{ text: "Experience" }]);
  });
});

describe("entryRows", () => {
  const rowsOf = (id: TemplateId, entry = job, kind: "job" | "school" | "item" = "job") =>
    entryRows(entry, kind, TEMPLATE_THEMES[id]).map(text);

  it("lays a job out the way each source does", () => {
    expect(rowsOf("classic")).toEqual([
      ["Northwind Payments", "Toronto, Canada"],
      ["Senior Backend Engineer", "Jan 2021 – Present"],
    ]);
    expect(rowsOf("developer")).toEqual([
      ["Senior Backend Engineer", "Jan 2021 – Present"],
      ["Northwind Payments", "Toronto, Canada"],
    ]);
    expect(rowsOf("compact")).toEqual([
      ["Northwind Payments, Toronto, Canada", "2021 – Present"],
      ["Senior Backend Engineer", ""],
    ]);
    expect(rowsOf("minimal")).toEqual([
      ["Senior Backend Engineer, Northwind Payments – Toronto, Canada", "Jan 2021 – Present"],
    ]);
  });

  it("folds into one line when a row would start empty, keeping every field", () => {
    const project: PdfEntry = {
      id: "p1",
      title: "Ledger Lint",
      org: "",
      detail: {
        text: "github.com/mayal/ledger-lint",
        href: "https://github.com/mayal/ledger-lint",
      },
      dates: "2023",
      tech: "Go, SQL",
      bullets: [],
    };
    expect(rowsOf("developer", project, "item")).toEqual([
      ["Ledger Lint | Go, SQL | github.com/mayal/ledger-lint", "2023"],
    ]);
    expect(rowsOf("modern", project, "item")).toEqual([
      ["Ledger Lint", "github.com/mayal/ledger-lint"],
      ["Go, SQL", "2023"],
    ]);
    const noTech = { ...project, tech: undefined };
    expect(rowsOf("modern", noTech, "item")).toEqual([
      ["Ledger Lint, github.com/mayal/ledger-lint", "2023"],
    ]);
    const noCompany = { ...job, org: "" };
    expect(rowsOf("classic", noCompany)).toEqual([
      ["Senior Backend Engineer, Toronto, Canada", "Jan 2021 – Present"],
    ]);
  });

  it("prints a run of roles at one company once, with each role under it", () => {
    const model = buildPdfModel({
      ...sampleResume(),
      experience: [
        { ...sampleResume().experience[0]! },
        {
          id: "e1b",
          title: "Backend Engineer",
          company: "Northwind Payments",
          location: "Toronto, Canada",
          startDate: "Mar 2019",
          endDate: "Dec 2020",
          bullets: [],
        },
      ],
    });
    const section = model.sections.find((item) => item.key === "experience")!;
    const [first, second] = "entries" in section ? section.entries : [];
    const both = (id: TemplateId) =>
      [first!, second!].flatMap((entry) => entryRows(entry, "job", TEMPLATE_THEMES[id]).map(text));
    expect(both("classic")).toEqual([
      ["Northwind Payments", "Toronto, Canada"],
      ["Senior Backend Engineer", "Jan 2021 – Present"],
      ["Backend Engineer", "Mar 2019 – Dec 2020"],
    ]);
    // The firm's whole span on its line, each title with its own years.
    expect(both("compact")).toEqual([
      ["Northwind Payments, Toronto, Canada", "2019 – Present"],
      ["Senior Backend Engineer", "2021 – Present"],
      ["Backend Engineer", "2019 – 2020"],
    ]);
    // Jake's: the first role in full, later ones on one italic line.
    expect(both("developer")).toEqual([
      ["Senior Backend Engineer", "Jan 2021 – Present"],
      ["Northwind Payments", "Toronto, Canada"],
      ["Backend Engineer", "Mar 2019 – Dec 2020"],
    ]);
  });
});

const designs = [
  {},
  ...DESIGN_FONTS.map((font) => ({ font })),
  ...DESIGN_ACCENTS.map((accent) => ({ accent })),
  { density: "compact" as const },
];

function letterSpacings(theme: TemplateTheme): number[] {
  return Object.values(theme.styles).map((style) =>
    typeof style.letterSpacing === "number" ? Math.abs(style.letterSpacing) : 0,
  );
}

describe("every format", () => {
  it.each(TEMPLATE_IDS)("%s keeps letter spacing at 0.8pt or less under any look", (id) => {
    for (const design of designs) {
      const theme = applyDesign(TEMPLATE_THEMES[id], design);
      expect(Math.max(...letterSpacings(theme))).toBeLessThanOrEqual(MAX_LETTER_SPACING);
    }
  });
});
