import { describe, expect, it } from "vitest";
import { BLUEPRINTS, topicsFor } from "@/lib/ai/interview-blueprints";
import { readTitle } from "@/lib/job-feed/occupations";
import {
  codingRoundLikely,
  FocusChoiceSchema,
  focusFromTitle,
  pickFocus,
  pickLevel,
  previewFocus,
  PREP_LEVELS,
  resolveFocus,
  ROLE_FOCUSES,
} from "./prep-focus";

const REACT_POST =
  "You'll build our React and Next.js app, own Core Web Vitals and accessibility (WCAG), and our design system.";
const GO_POST =
  "You'll build Go services on PostgreSQL and Kafka, with gRPC APIs and Redis caching.";
const AI_POST =
  "You'll ship LLM features: RAG over our docs, embeddings in a vector database, evals and prompt caching.";

describe("focusFromTitle", () => {
  it.each([
    ["Senior AI Engineer", "ai-ml"],
    ["Machine Learning Engineer II", "ai-ml"],
    ["Applied Scientist, LLMs", "ai-ml"],
    ["Staff Backend Engineer (Payments)", "backend"],
    ["Software Engineer, Back End", "backend"],
    ["Junior Front-End Developer", "frontend"],
    ["Design Engineer", "frontend"],
    ["Full Stack Developer (React/Node)", "fullstack"],
    ["iOS Engineer", "mobile"],
    ["Senior Data Scientist, Experimentation", "data-science"],
    ["Data Analyst", "data-analysis"],
    ["Marketing Analyst", "data-analysis"],
    ["Analytics Engineer", "data-engineering"],
    ["Site Reliability Engineer", "devops"],
    ["Platform Engineer", "devops"],
    ["Application Security Engineer", "security"],
    ["SDET", "qa"],
    ["QA Automation Engineer", "qa"],
    ["Senior Product Manager", "product"],
    ["AI Product Manager", "product"],
    ["Product Designer", "design"],
    ["UX Researcher", "design"],
    ["Software Engineer", "software"],
    ["Member of Technical Staff", "software"],
    ["Business Intelligence Developer", "data-analysis"],
  ])("reads %s as %s", (title, focus) => {
    expect(focusFromTitle(title)).toBe(focus);
  });

  it.each([
    "Marketing Manager, AI",
    "Account Executive, AI Platform",
    "Sales Engineer",
    "Customer Support Engineer",
    "Registered Nurse",
    "Business Analyst",
    "Program Manager",
    "Product Marketing Manager",
  ])("gives %s no technical round", (title) => {
    expect(focusFromTitle(title)).toBeNull();
  });

  it("falls back to the occupation Otto's classifier reads from the title", () => {
    expect(
      focusFromTitle(
        "Computer Systems Engineer",
        readTitle("Computer Systems Engineer").occupation,
      ),
    ).toBe("devops");
  });
});

describe("pickFocus", () => {
  it("lets the post decide for a plain software title", () => {
    expect(pickFocus({ title: "Software Engineer", post: REACT_POST })).toBe("frontend");
    expect(pickFocus({ title: "Software Engineer", post: GO_POST })).toBe("backend");
    expect(pickFocus({ title: "Software Engineer", post: AI_POST })).toBe("ai-ml");
    expect(pickFocus({ title: "Software Engineer", post: `${REACT_POST} ${GO_POST}` })).toBe(
      "fullstack",
    );
    expect(pickFocus({ title: "Software Engineer", post: "Join our team." })).toBe("backend");
  });

  it("lets the post decide among the data roles for a plain data title", () => {
    expect(
      pickFocus({ title: "Analyst", post: "SQL, dashboards in Looker and KPI reporting." }),
    ).toBe("data-analysis");
    expect(
      pickFocus({
        title: "Analyst",
        post: "Design experiments and A/B tests, causal inference and regression.",
      }),
    ).toBe("data-science");
  });

  it("keeps a clear title over the post", () => {
    expect(pickFocus({ title: "Frontend Engineer", post: GO_POST })).toBe("frontend");
  });
});

describe("pickLevel", () => {
  it("reads the title first, then the years the post asks for", () => {
    expect(pickLevel({ title: "Junior Developer", post: "" })).toBe("junior");
    expect(pickLevel({ title: "Engineering Intern", post: "" })).toBe("junior");
    expect(pickLevel({ title: "Senior Backend Engineer", post: "" })).toBe("senior");
    expect(pickLevel({ title: "Staff Engineer", post: "" })).toBe("staff");
    expect(pickLevel({ title: "Engineering Manager", post: "" })).toBe("staff");
    expect(pickLevel({ title: "Backend Engineer", post: "" })).toBe("mid");
    expect(
      pickLevel({ title: "Backend Engineer", post: "You have 6+ years of experience in Go." }),
    ).toBe("senior");
    expect(
      pickLevel({ title: "Backend Engineer", post: "1 year of experience with Python." }),
    ).toBe("junior");
  });
});

describe("codingRoundLikely", () => {
  it("spots a coding round in the post's process", () => {
    expect(
      codingRoundLikely(
        "Our process: a 60-minute live coding interview, then a system design chat.",
      ),
    ).toBe(true);
    expect(codingRoundLikely("A short take-home exercise.")).toBe(true);
    expect(codingRoundLikely("A pairing session with the team.")).toBe(true);
    expect(codingRoundLikely("A chat with the hiring manager, then the team.")).toBe(false);
  });
});

describe("resolveFocus", () => {
  it("uses the person's choice, picks the rest, and never gives product or design a coding round", () => {
    const job = {
      title: "Senior Product Manager",
      post: "Our process includes a take-home exercise.",
    };
    expect(resolveFocus({ role: "auto", level: "auto" }, job)).toEqual({
      focus: "product",
      level: "senior",
      coding: false,
    });
    expect(resolveFocus({ role: "backend", level: "auto" }, job)).toEqual({
      focus: "backend",
      level: "senior",
      coding: true,
    });
    expect(resolveFocus({ role: "none", level: "staff" }, job)).toBeNull();
    expect(
      resolveFocus({ role: "auto", level: "auto" }, { title: "Registered Nurse", post: "" }),
    ).toBeNull();
  });

  it("defaults to auto when the request leaves it out, and refuses unknown values", () => {
    expect(FocusChoiceSchema.parse({})).toEqual({ role: "auto", level: "auto" });
    expect(FocusChoiceSchema.safeParse({ role: "astrology" }).success).toBe(false);
  });
});

describe("previewFocus", () => {
  it("says the post decides when the form can't know yet", () => {
    expect(previewFocus("Software Engineer", null)).toEqual({ focus: "post", level: "post" });
    expect(previewFocus("Senior Backend Engineer", null)).toEqual({
      focus: "backend",
      level: "senior",
    });
    expect(previewFocus("Software Engineer", REACT_POST)).toEqual({
      focus: "frontend",
      level: "mid",
    });
    expect(previewFocus("Registered Nurse", null)).toEqual({ focus: null, level: "post" });
  });
});

describe("blueprints", () => {
  it("cover every focus with topics at every level and a design prompt for each", () => {
    for (const focus of ROLE_FOCUSES) {
      for (const level of PREP_LEVELS) {
        expect(topicsFor(BLUEPRINTS[focus], level).length).toBeGreaterThanOrEqual(6);
        expect(BLUEPRINTS[focus].design[level]).not.toBe("");
      }
    }
  });

  it("add harder topics as the level rises", () => {
    const names = (level: (typeof PREP_LEVELS)[number]) =>
      topicsFor(BLUEPRINTS.backend, level).map((item) => item.name);
    expect(names("junior")).not.toContain("Zero-downtime migrations and backfills");
    expect(names("senior")).toContain("Zero-downtime migrations and backfills");
    expect(names("staff")).toContain(
      "Platform standards across teams: SLOs, ownership and shared libraries",
    );
    expect(topicsFor(BLUEPRINTS.frontend, "senior").map((item) => item.name)).not.toContain(
      "Browser basics: the event loop and the rendering pipeline",
    );
  });

  it("include the AI engineer topics a real loop probes", () => {
    const names = BLUEPRINTS["ai-ml"].topics.map((item) => item.name).join(" | ");
    for (const topic of [
      "RAG",
      "Chunking",
      "Retrieval evaluation",
      "LLM evals",
      "KV cache",
      "Fine-tuning vs RAG",
      "Guardrails",
      "Data privacy",
      "Model choice",
      "Latency and cost",
      "Observability",
    ]) {
      expect(names).toContain(topic);
    }
  });
});
