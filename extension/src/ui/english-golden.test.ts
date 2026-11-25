import { describe, expect, it } from "vitest";
import type { ApplyAnswers } from "@/lib/extension/answers";
import type { FillState } from "../forms/session";
import { blockedText, eligibilityLine, missingLine, skillsLine, type BadgeMatch } from "../match";
import type { JobPost } from "../page/post";
import { toastHtml } from "./fill-view";
import { render, type MatchView, type Mode } from "./view";

// Everything the badge and the fill card draw in English, saved before the extension took chrome.i18n: English must never change.

const GOLDEN = "./golden/english.json";
const NOW = Date.UTC(2026, 10, 22, 6);

const POST: JobPost = {
  site: "linkedin",
  url: "https://www.linkedin.com/jobs/view/1/",
  title: "Senior Backend Engineer",
  company: "Northwind",
  location: "Remote · Asia-Pacific",
  text: "Go, Kafka",
  source: "page",
};

const MATCH: BadgeMatch = {
  skills: {
    found: 2,
    total: 6,
    missing: ["Kafka", "Terraform", "Rust", "Scala"],
    rows: [
      {
        id: "go",
        term: "Go",
        importance: "must",
        status: "shown",
        where: { place: "Experience", text: "Built Go services" },
      },
      { id: "pg", term: "PostgreSQL", importance: null, status: "listed", where: null },
      { id: "kafka", term: "Kafka", importance: "nice", status: "missing", where: null },
    ],
  },
  eligibility: {
    tone: "check",
    text: "Posted for Asia-Pacific (remote)",
    findings: [
      {
        rule: "location",
        verdict: "check",
        note: "The post asks for APAC.",
        quote: "",
        source: "post",
      },
      {
        rule: "sponsorship",
        verdict: "blocked",
        note: "No sponsorship.",
        quote: "",
        source: "post",
      },
    ],
  },
};

const ANSWERS: ApplyAnswers = {
  noticePeriod: "30 days",
  currentPay: { amount: 18, currency: "INR", period: "year" },
  expectedPay: null,
  workRights: { IN: { authorized: true, sponsorship: false } },
  relocate: true,
  startDate: "",
  heardFrom: "LinkedIn",
  custom: [{ question: "Why us?", answer: "Because", at: 1 }],
};

function state(overrides: Partial<FillState> = {}): FillState {
  return {
    phase: "done",
    error: null,
    report: {
      filled: 12,
      kept: 1,
      missed: ["Phone", "City", "LinkedIn", "Website"],
      file: "Priya.pdf",
      fileError: null,
      protectedCount: 2,
      drafts: 2,
      resumeTitle: "Backend resume",
      tailored: false,
      steps: 1,
    },
    asks: [
      {
        key: "a1",
        label: "Notice period",
        input: "text",
        options: [],
        store: { kind: "custom", question: "a" },
      },
      {
        key: "a2",
        label: "Relocate?",
        input: "yesno",
        options: [],
        store: { kind: "custom", question: "b" },
      },
      {
        key: "a3",
        label: "Shift",
        input: "choice",
        options: ["Day", "Night"],
        store: { kind: "custom", question: "c" },
      },
      {
        key: "a4",
        label: "Tools",
        input: "multi",
        options: ["Go", "Rust"],
        store: { kind: "custom", question: "d" },
      },
      {
        key: "a5",
        label: "Pay",
        input: "pay",
        options: [],
        store: { kind: "custom", question: "e" },
      },
    ],
    asking: false,
    draft: null,
    answers: { saved: ANSWERS, effective: ANSWERS },
    answersError: null,
    answersBusy: false,
    toast: null,
    ...overrides,
  };
}

function view(overrides: Partial<MatchView> = {}): MatchView {
  return {
    kind: "match",
    post: POST,
    match: MATCH,
    siteName: "LinkedIn",
    resumes: [
      { id: "r1", title: "Backend resume" },
      { id: "r2", title: "Data resume" },
    ],
    resumeId: "r1",
    access: { badge: true, save: true, tailor: true, letter: false, fill: true },
    saved: false,
    busy: null,
    error: null,
    form: null,
    ...overrides,
  };
}

function renderAll() {
  const modes: Mode[] = ["mini", "card", "panel"];
  const draft = { key: "d1", question: "Why us?", text: "Because", busy: false, error: null };
  return {
    simple: [
      render({ kind: "hidden" }, "card"),
      render({ kind: "connect", siteName: "LinkedIn" }, "card"),
      render({ kind: "connect", siteName: "LinkedIn" }, "mini"),
      render({ kind: "loading", siteName: "LinkedIn" }, "card"),
      render({ kind: "no-resume", siteName: "LinkedIn" }, "card"),
      render({ kind: "select", siteName: "example.com", error: null }, "card"),
      render({ kind: "select", siteName: "example.com", error: "Too short." }, "card"),
    ],
    match: modes.map((mode) => render(view(), mode)),
    saved: render(view({ saved: true, error: null }), "card"),
    failed: render(view({ error: "Something went wrong." }), "card"),
    busy: render(view({ busy: "save", access: { ...view().access, tailor: false } }), "card"),
    allFound: render(
      view({
        match: {
          ...MATCH,
          skills: { found: 1, total: 1, missing: [], rows: [] },
          eligibility: { tone: "ok", text: "Open to India", findings: [] },
        },
      }),
      "card",
    ),
    noSkills: render(
      view({
        match: {
          ...MATCH,
          skills: { found: 0, total: 0, missing: [], rows: [] },
          eligibility: { tone: "none", text: "No place or work rules in the post", findings: [] },
        },
      }),
      "mini",
    ),
    manySkills: render(
      view({ match: { ...MATCH, skills: { ...MATCH.skills!, found: 9, total: 20 } } }),
      "card",
    ),
    fill: [
      render(view({ form: { allowed: false, state: state({ phase: "idle" }) } }), "card"),
      render(view({ form: { allowed: true, state: state({ phase: "idle" }) } }), "card"),
      render(view({ form: { allowed: true, state: state({ phase: "loading" }) } }), "card"),
      render(view({ form: { allowed: true, state: state({ phase: "error" }) } }), "card"),
      render(
        view({ form: { allowed: true, state: state({ phase: "error", error: "No form." }) } }),
        "card",
      ),
      render(view({ form: { allowed: true, state: state() } }), "card"),
      render(
        view({
          form: {
            allowed: true,
            state: state({
              asks: [state().asks[0]!],
              report: { ...state().report!, file: null, missed: [], protectedCount: 0, drafts: 1 },
              error: "Couldn't save.",
            }),
          },
        }),
        "card",
      ),
      render(
        view({
          form: {
            allowed: true,
            state: state({ report: { ...state().report!, tailored: true, fileError: "No PDF." } }),
          },
        }),
        "card",
      ),
      render(view({ form: { allowed: true, state: state({ draft }) } }), "card"),
      render(
        view({ form: { allowed: true, state: state({ draft: { ...draft, busy: true } }) } }),
        "card",
      ),
      render(
        view({
          form: { allowed: true, state: state({ draft: { ...draft, error: "Out of drafts." } }) },
        }),
        "card",
      ),
    ],
    answers: [
      render(view({ form: { allowed: true, state: state() } }), "answers"),
      render(
        view({
          form: {
            allowed: true,
            state: state({ answers: null, answersBusy: true }),
          },
        }),
        "answers",
      ),
      render(view({ form: { allowed: true, state: state({ answers: null }) } }), "answers"),
      render(
        view({
          form: {
            allowed: true,
            state: state({ answersError: "Couldn't save.", answersBusy: true }),
          },
        }),
        "answers",
      ),
    ],
    toasts: [
      toastHtml(null),
      toastHtml({ kind: "undone" }),
      toastHtml({ kind: "error", message: "Couldn't undo." }),
      toastHtml({
        kind: "applied",
        id: "a",
        company: "Northwind",
        role: "Engineer",
        boardPath: "/b",
        busy: false,
      }),
      toastHtml({ kind: "applied", id: "a", company: "", role: "", boardPath: "/b", busy: true }),
    ],
    lines: [
      skillsLine({ found: 0, total: 0 }),
      skillsLine({ found: 1, total: 1 }),
      skillsLine({ found: 3, total: 7 }),
      missingLine([]),
      missingLine(["Go"]),
      missingLine(["Go", "Rust", "Kafka", "Scala", "Elixir"]),
      ...[
        { rule: "authorization", note: "You need the right to work in the United States." },
        { rule: "sponsorship", note: "No sponsorship in the United Kingdom." },
        { rule: "sponsorship", note: "No sponsorship in Canada." },
        { rule: "location", note: "This is for people in Germany. More text." },
        { rule: "location", note: "The job is in Berlin, and it isn't remote." },
        { rule: "location", note: "Somewhere else entirely." },
        { rule: "time_zone", note: "You're on UTC+5:30. Far." },
      ].map((finding) =>
        blockedText({ verdict: "blocked", quote: "", source: "post", ...finding } as never),
      ),
      ...[
        { place: "c:IN", location: "Bengaluru, India" },
        { place: "g:apac", location: "Remote · Asia-Pacific" },
        { place: "c:US", location: "Bengaluru, India" },
        { place: "anywhere", location: "Remote · Bengaluru, India" },
        { place: "anywhere", location: "" },
      ].map(
        ({ place, location }) =>
          eligibilityLine(
            { location, text: "Remote role." },
            null,
            { place: place as never, remote: false },
            { now: NOW },
          ).text,
      ),
    ],
  };
}

// Icons and Otto's head are drawn the same in every language, so the saved copy leaves them out.
const withoutDrawings = (value: unknown) =>
  `${JSON.stringify(value, null, 2).replace(/<svg[\s\S]*?<\/svg>/g, "<svg/>")}\n`;

describe("the badge in English", () => {
  it("draws exactly what it drew before languages", async () => {
    await expect(withoutDrawings(renderAll())).toMatchFileSnapshot(GOLDEN);
  });
});
