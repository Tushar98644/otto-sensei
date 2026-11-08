import { describe, expect, it } from "vitest";
import type { TailorRequirement, TailorResult } from "@/lib/ai/types";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import type { TailorChoices } from "./apply";
import {
  buildScreener,
  hasBlank,
  lineQuestion,
  missingName,
  tidyLine,
  verbNote,
  writingAllowance,
} from "./screener";

function resume(): Resume {
  return {
    ...emptyResume(0),
    summary: "Platform engineer who writes Terraform.",
    experience: [
      {
        id: "job",
        title: "Engineer",
        company: "Mapline",
        location: "",
        startDate: "",
        endDate: "",
        bullets: [{ id: "a", text: "Rebuilt the billing service in Go" }],
      },
    ],
    skills: [{ id: "k", label: "", items: ["Kubernetes"] }],
  };
}

const terraform: TailorRequirement = {
  id: "r1",
  text: "Terraform",
  importance: "must",
  source: "structure",
  terms: ["Terraform"],
  quote: "",
  ask: "Have you used Terraform?",
};

function result(): TailorResult {
  return {
    job: { title: "", company: "" },
    requirements: [
      terraform,
      { ...terraform, id: "r2", text: "Go", terms: ["Go", "Golang"], ask: "Have you used Go?" },
      { ...terraform, id: "r3", text: "Kubernetes", terms: ["Kubernetes"] },
      { ...terraform, id: "r4", text: "Kafka", importance: "nice", terms: ["Kafka"] },
    ],
    keywords: [],
    askUser: [],
    bulletOrder: [],
    // A suggested summary that repeats the skills list must not count as proof.
    summary: "Engineer who runs Kubernetes and Kafka in production.",
    notes: [],
  };
}

describe("buildScreener", () => {
  it("counts proof the way a screener would, and moves when a confirmed line is added", () => {
    const none: TailorChoices = { requirements: {}, reorder: {}, useSummary: true };
    const before = buildScreener(resume(), result(), none);
    expect(before.rows.map((row) => row.status)).toEqual(["proven", "proven", "listed", "missing"]);
    expect(before.headline).toBe("Must-haves proven: 2 of 3 · Nice-to-haves: 0 of 1");

    const added: TailorChoices = {
      ...none,
      requirements: {
        r3: { kind: "line", line: { id: "n1", parentId: "job", text: "Ran 40 services on Kubernetes" } },
        r4: { kind: "no" },
      },
    };
    const after = buildScreener(resume(), result(), added);
    expect(after.counts).toEqual({ must: { proven: 3, total: 3 }, nice: { proven: 0, total: 1 } });
    expect(after.rows.map((row) => row.status)).toEqual(["proven", "proven", "proven", "declined"]);
    expect(after.rows[2]?.proof.line?.bulletId).toBe("n1");
  });
});

describe("the add-a-line helpers", () => {
  it("asks the line fixer for the where and the what", () => {
    expect(lineQuestion(terraform)).toBe("Have you used Terraform? Where, and what did you do?");
  });

  it("asks for the name when a line about a tool never says it", () => {
    expect(missingName(terraform, "Set up our staging servers with it")).toBe(
      "Name Terraform in the line, so a screener can find it.",
    );
    expect(missingName(terraform, "Set up staging with Terraform")).toBeNull();
    expect(missingName({ ...terraform, terms: [] }, "Mentored two new hires")).toBeNull();
  });

  it("flags a line that claims more than the person said", () => {
    expect(verbNote("I helped set up staging with Terraform", "Led the staging setup with Terraform")).toBe(
      "Otto wrote “led”, which claims more than you said. Change it if it isn't right.",
    );
    expect(verbNote("I set up staging with Terraform", "Set up staging with Terraform")).toBeNull();
    // Real GLM Flash output: "helped set up" came back as plain "Set up".
    expect(
      verbNote(
        "At Brightloop I helped set up Amplitude dashboards to track how teams adopted the add-on",
        "Set up Amplitude dashboards tracking add-on adoption across teams",
      ),
    ).toBe("You said you helped; this line reads as if you did it alone. Add it back if that's fairer.");
  });

  it("drops the fixer's trailing asks for more, and keeps blanks the person must fill", () => {
    expect(
      tidyLine(
        "Set up Amplitude dashboards tracking add-on adoption across teams [add result if known, e.g. informing rollout decisions]",
      ),
    ).toBe("Set up Amplitude dashboards tracking add-on adoption across teams");
    const kept = tidyLine(
      "Presented quarterly launch plans [X times] to VP of Marketing and CEO, [securing approval / shaping launch priorities].",
    );
    expect(kept).toBe("Presented quarterly launch plans [X times] to VP of Marketing and CEO");
    expect(hasBlank(kept)).toBe(true);
    expect(hasBlank(tidyLine("Set up staging with Terraform."))).toBe(false);
  });

  it("shows the letter allowance on every plan", () => {
    expect(writingAllowance(null, null)).toBe(
      "Needs a free account, with 5 cover letters and answers a month.",
    );
    expect(writingAllowance("free", { used: 2, limit: 5 })).toBe(
      "3 of 5 free cover letters and answers left this month.",
    );
    expect(writingAllowance("free", { used: 5, limit: 5 })).toContain("No free cover letters");
    expect(writingAllowance("pro", { used: 2, limit: 100 })).toBe(
      "98 of 100 cover letters and answers left this month.",
    );
  });
});
