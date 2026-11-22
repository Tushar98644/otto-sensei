import type { FillProfile } from "@/lib/extension/types";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { PageNode } from "../page/dom";
import { pageFromHtml } from "../testing/mini-dom";
import { profile } from "./fixture-profile";
import { planForm, websiteLinks, type Planned } from "./plan";
import { formRoot } from "./platforms";
import { scanQuestions } from "./scan";
import { addPanels, panelsWanted, workdayLists, type PanelKind } from "./workday";

const WORKDAY =
  "https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite/job/US-CA-Remote/Senior-Security-Engineer_JR2022836/apply/applyManually";
const POST = { title: "Engineer", company: "Acme", location: "Santa Clara, CA, US", text: "" };

const read = (file: string) =>
  readFileSync(new URL(`../../fixtures/forms/${file}`, import.meta.url), "utf8");
const EMPTY = read("workday-experience-add.html");
const ONE_EACH = read("workday-experience.html");

const NAMES: Record<PanelKind, { prefix: string; name: string }> = {
  work: { prefix: "workExperience", name: "Work Experience" },
  education: { prefix: "education", name: "Education" },
  websites: { prefix: "webAddress", name: "Websites" },
};

// A panel as Workday draws it, from the step saved after one Add in each list.
function template(kind: PanelKind): string {
  const { prefix, name } = NAMES[kind];
  const start = ONE_EACH.indexOf(`<div data-automation-id="${prefix}-1">`);
  const end = ONE_EACH.indexOf(
    `<button type="button" data-automation-id="Add" aria-label="Add Another ${name}">`,
  );
  expect(start).toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  return ONE_EACH.slice(start, end);
}

// A stand-in for Workday: each Add draws the list's next panel and turns into Add Another.
function fakeWorkday(html: string, renders = true) {
  const pressed: string[] = [];
  const form = () => formRoot("workday", pageFromHtml(html, WORKDAY).root);
  const press = (button: PageNode) => {
    const label = button.getAttribute("aria-label") ?? "";
    pressed.push(label);
    const kind = (Object.keys(NAMES) as PanelKind[]).find((key) => label.endsWith(NAMES[key].name));
    if (!renders || !kind) return;
    const { prefix, name } = NAMES[kind];
    const n = (html.match(new RegExp(`data-automation-id="${prefix}-\\d+"`, "g")) ?? []).length + 1;
    const panel = template(kind)
      .replace(new RegExp(`${prefix}-1\\b`, "g"), `${prefix}-${n}`)
      .replace(`<h4>${name} 1</h4>`, `<h4>${name} ${n}</h4>`);
    html = html.replace(
      new RegExp(
        `<button type="button" data-automation-id="Add" aria-label="Add (?:Another )?${name}">[^<]*</button>`,
      ),
      `${panel}<button type="button" data-automation-id="Add" aria-label="Add Another ${name}">Add Another</button>`,
    );
  };
  const lists = () => {
    const found = form();
    return found ? workdayLists(found) : [];
  };
  const run = (fill: FillProfile) =>
    addPanels(lists, panelsWanted(fill), press, async (ready) => ready());
  const plan = (fill: FillProfile): Planned[] => {
    const page = pageFromHtml(html, WORKDAY);
    const found = formRoot("workday", page.root);
    return found ? planForm(scanQuestions("workday", page.root, found), fill, POST) : [];
  };
  return { pressed, lists, run, plan };
}

// What each panel's field gets, in page order.
function values(items: Planned[], label: string): string[] {
  return items
    .filter((item) => item.question.label === label)
    .map((item) =>
      item.status === "fill" && (item.want.kind === "text" || item.want.kind === "choice")
        ? item.want.kind === "text"
          ? item.want.value
          : item.want.values[0]!
        : item.status,
    );
}

function twoOfEach(): FillProfile {
  const base = profile();
  return profile({
    work: [
      ...base.work,
      {
        company: "Unbabel",
        title: "Analyst Intern",
        location: "Lisbon",
        start: { month: 6, year: 2020 },
        end: { month: 2, year: 2022 },
        current: false,
        description: "- Cleaned translation quality data.",
      },
    ],
    education: [
      ...base.education,
      {
        school: "Nova School of Business and Economics",
        degree: "Master of Science",
        field: "Business Analytics",
        start: { month: null, year: 2020 },
        end: { month: null, year: 2022 },
      },
    ],
  });
}

describe("Workday's Add buttons", () => {
  it("finds each list on My Experience, its panels and its own Add, and nothing on the other steps", () => {
    const empty = fakeWorkday(EMPTY).lists();
    expect(empty.map(({ kind, panels }) => [kind, panels])).toEqual([
      ["work", 0],
      ["education", 0],
      ["websites", 0],
    ]);
    expect(empty.map((list) => list.add?.getAttribute("aria-label"))).toEqual([
      "Add Work Experience",
      "Add Education",
      "Add Websites",
    ]);
    const added = fakeWorkday(ONE_EACH).lists();
    expect(added.map(({ panels }) => panels)).toEqual([1, 1, 1]);
    expect(added.map((list) => list.add?.textContent)).toEqual([
      "Add Another",
      "Add Another",
      "Add Another",
    ]);
    for (const file of [
      "workday-information.html",
      "workday-questions.html",
      "workday-disclosures.html",
      "workday-review.html",
    ]) {
      expect(fakeWorkday(read(file)).lists()).toEqual([]);
    }
  });

  it("reads the newer markup, a group named by its heading", () => {
    const html = `<div data-automation-id="applyFlowPage"><div role="group" aria-labelledby="Work-Experience-section"><h3 id="Work-Experience-section">Work Experience</h3><div data-fkit-id="workExperience-1"><input id="workExperience-1--jobTitle"></div><button data-automation-id="add-button">Add Another</button></div><button data-automation-id="bottom-navigation-next-button">Add and Continue</button></div>`;
    const lists = fakeWorkday(html).lists();
    expect(lists).toHaveLength(1);
    expect(lists[0]?.kind).toBe("work");
    expect(lists[0]?.panels).toBe(1);
    expect(lists[0]?.add?.getAttribute("data-automation-id")).toBe("add-button");
  });

  it("adds one panel per job, school and link, then each fills from its own entry", async () => {
    const fill = twoOfEach();
    const workday = fakeWorkday(EMPTY);
    expect(await workday.run(fill)).toBe(6);
    expect(workday.pressed).toEqual([
      "Add Work Experience",
      "Add Another Work Experience",
      "Add Education",
      "Add Another Education",
      "Add Websites",
      "Add Another Websites",
    ]);
    expect(workday.lists().map(({ panels }) => panels)).toEqual([2, 2, 2]);
    const items = workday.plan(fill);
    expect(values(items, "Job Title")).toEqual(["Data Analyst", "Analyst Intern"]);
    expect(values(items, "Company")).toEqual(["Feedzai", "Unbabel"]);
    expect(values(items, "School or University")).toEqual([
      "University of Lisbon",
      "Nova School of Business and Economics",
    ]);
    expect(values(items, "Field of Study")).toEqual(["Statistics", "Business Analytics"]);
    expect(values(items, "URL")).toEqual(["https://anasouza.dev", "https://github.com/anasouza"]);
    // The second job ended, so its To dates fill; the current one's stay empty.
    const months = values(items, "Month");
    expect(months).toEqual(["03", "skip", "06", "02"]);
    // A second run finds every list full and presses nothing.
    expect(await workday.run(fill)).toBe(0);
    expect(workday.pressed).toHaveLength(6);
  });

  it("stops at the resume's entries and leaves panels already there alone", async () => {
    const workday = fakeWorkday(ONE_EACH);
    // One job and one school, already drawn; two links, one panel for them so far.
    expect(await workday.run(profile())).toBe(1);
    expect(workday.pressed).toEqual(["Add Another Websites"]);
    expect(values(workday.plan(profile()), "URL")).toEqual([
      "https://anasouza.dev",
      "https://github.com/anasouza",
    ]);
    const none = fakeWorkday(EMPTY);
    expect(
      await none.run(
        profile({
          work: [],
          education: [],
          contact: { ...profile().contact, portfolio: "", website: "", github: "" },
        }),
      ),
    ).toBe(0);
    expect(none.pressed).toEqual([]);
  });

  it("presses each Add once and moves on when no panel comes", async () => {
    const workday = fakeWorkday(EMPTY, false);
    expect(await workday.run(twoOfEach())).toBe(0);
    expect(workday.pressed).toEqual(["Add Work Experience", "Add Education", "Add Websites"]);
  });

  it("puts each link in once: the person's own site, then GitHub", () => {
    expect(websiteLinks(profile().contact)).toEqual([
      "https://anasouza.dev",
      "https://github.com/anasouza",
    ]);
    expect(
      websiteLinks({
        ...profile().contact,
        portfolio: "",
        website: " https://ana.blog ",
        github: "",
      }),
    ).toEqual(["https://ana.blog"]);
  });
});
