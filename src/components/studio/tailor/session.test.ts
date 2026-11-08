import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TailorResult } from "@/lib/ai/types";
import {
  EMPTY_DRAFT,
  loadDraft,
  loadResult,
  saveTailorSession,
  type SavedResult,
  type TailorDraft,
} from "./session";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

const result: TailorResult = {
  job: { title: "Designer", company: "Canva" },
  requirements: [
    {
      id: "r1",
      text: "Figma",
      importance: "must",
      source: "structure",
      terms: ["Figma"],
      quote: "",
      ask: "Have you used Figma?",
    },
  ],
  keywords: [{ term: "Figma", importance: "must", inResume: true, evidence: "" }],
  askUser: [],
  bulletOrder: [],
  summary: "",
  notes: [],
};

const saved: SavedResult = {
  id: "run-1",
  sourceId: "resume-1",
  job: { title: "Designer", company: "Canva", text: "A long job post." },
  result,
};

let storage: Storage;

beforeEach(() => {
  storage = memoryStorage();
  vi.stubGlobal("window", { sessionStorage: storage });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("tailor session", () => {
  it("starts empty", () => {
    expect(loadDraft()).toEqual(EMPTY_DRAFT);
    expect(loadResult("resume-1")).toBeNull();
  });

  it("keeps the draft for any resume and the result only for its own", () => {
    saveTailorSession({ title: "Designer", company: "", text: "Post" }, saved);
    expect(loadDraft()).toEqual({ title: "Designer", company: "", text: "Post" });
    expect(loadResult("resume-1")).toEqual(saved);
    expect(loadResult("resume-2")).toBeNull();
  });

  it("ignores data it doesn't recognize", () => {
    storage.setItem("otto-tailor-v1", "{not json");
    expect(loadDraft()).toEqual(EMPTY_DRAFT);
    storage.setItem(
      "otto-tailor-v1",
      JSON.stringify({ version: 1, draft: EMPTY_DRAFT, last: { ...saved, result: { job: {} } } }),
    );
    expect(loadDraft()).toEqual(EMPTY_DRAFT);
    expect(loadResult("resume-1")).toBeNull();
  });

  it("keeps working when storage is blocked", () => {
    vi.stubGlobal("window", {
      get sessionStorage(): Storage {
        throw new Error("SecurityError");
      },
    });
    expect(() => saveTailorSession(EMPTY_DRAFT, null)).not.toThrow();
    expect(loadDraft()).toEqual(EMPTY_DRAFT);
  });

  it("keeps a job read from a link across a reload", () => {
    const read: TailorDraft = {
      title: "AI Transformation Owner, CRO",
      company: "GitLab",
      text: "GitLab is the intelligent orchestration platform for DevSecOps.",
      link: "https://job-boards.greenhouse.io/gitlab/jobs/8638232002",
      paste: false,
      posting: {
        url: "https://job-boards.greenhouse.io/gitlab/jobs/8638232002",
        source: "greenhouse",
        title: "AI Transformation Owner, CRO",
        company: "GitLab",
        location: "Remote, United States",
        firstPostedAt: Date.UTC(2026, 6, 22, 17, 38, 40),
        updatedAt: Date.UTC(2026, 10, 6, 20, 25, 7),
        closesAt: null,
      },
    };
    saveTailorSession(read, { ...saved, job: read });
    expect(loadDraft()).toEqual(read);
    expect(loadResult("resume-1")?.job).toEqual(read);
  });

  it("keeps the form's screening questions and drops broken ones", () => {
    const question = {
      label: "Will you now or in the future require sponsorship for a visa?",
      required: true,
      kind: "yes_no",
      options: ["Yes", "No"],
      optionCount: 2,
    } as const;
    const posting = {
      url: "https://job-boards.greenhouse.io/gitlab/jobs/8638232002",
      source: "greenhouse",
      title: "Engineer",
      company: "GitLab",
      location: "",
      firstPostedAt: null,
      updatedAt: null,
      closesAt: null,
    } as const;
    const draft = { title: "Engineer", company: "GitLab", text: "Post", paste: false };
    storage.setItem(
      "otto-tailor-v1",
      JSON.stringify({
        version: 1,
        draft: { ...draft, posting: { ...posting, questions: [question, { label: 4 }] } },
        last: null,
      }),
    );
    expect(loadDraft().posting).toEqual({ ...posting, questions: [question] });
  });

  it("drops a damaged posting but keeps the rest of the draft", () => {
    const draft = {
      title: "Designer",
      company: "Canva",
      text: "Post",
      link: "https://x.com/1",
      paste: false,
    };
    storage.setItem(
      "otto-tailor-v1",
      JSON.stringify({
        version: 1,
        draft: { ...draft, posting: { url: 1, source: "myspace" } },
        last: null,
      }),
    );
    expect(loadDraft()).toEqual(draft);
    storage.setItem(
      "otto-tailor-v1",
      JSON.stringify({ version: 1, draft: { ...draft, link: 42, paste: "yes" }, last: null }),
    );
    expect(loadDraft()).toEqual({ title: "Designer", company: "Canva", text: "Post" });
  });

  it("keeps choices, the letter and answers, and drops only the parts that are damaged", () => {
    const full: SavedResult = {
      ...saved,
      demo: true,
      choices: {
        requirements: { r1: { kind: "line", line: { id: "new-1", parentId: "job-1", text: "Drew the app in Figma" } } },
        reorder: { "job-1": false },
        useSummary: true,
      },
      letter: { text: "Dear Canva team,", warnings: ["Fill in [number]."], demo: false },
      answers: [{ id: "a1", question: "Why Canva?", text: "Because.", warnings: [], demo: false }],
      copyId: "copy-1",
    };
    saveTailorSession(EMPTY_DRAFT, full);
    expect(loadResult("resume-1")).toEqual(full);

    storage.setItem(
      "otto-tailor-v1",
      JSON.stringify({
        version: 1,
        draft: EMPTY_DRAFT,
        last: {
          ...full,
          choices: { requirements: { r1: { kind: "maybe" }, r2: { kind: "no" } }, reorder: { a: "yes" }, useSummary: false },
          letter: { text: 4 },
          answers: [{ id: "a1", question: "Why?", text: "Fine.", warnings: [3, "Check it."] }, { id: 2 }],
          copyId: 9,
        },
      }),
    );
    expect(loadResult("resume-1")).toEqual({
      ...saved,
      demo: true,
      choices: { requirements: { r2: { kind: "no" } }, reorder: {}, useSummary: false },
      answers: [{ id: "a1", question: "Why?", text: "Fine.", warnings: ["Check it."], demo: false }],
    });
  });

  it("reads a result saved before requirements existed", () => {
    const old: Partial<TailorResult> = { ...result };
    delete old.requirements;
    storage.setItem("otto-tailor-v1", JSON.stringify({ version: 1, draft: EMPTY_DRAFT, last: { ...saved, result: old } }));
    expect(loadResult("resume-1")?.result.requirements).toEqual([]);
  });
});
