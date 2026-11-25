import { describe, expect, it } from "vitest";
import { fmt, selectPlural } from "@/i18n/format";
import de from "@/i18n/messages/de/lint";
import en from "@/i18n/messages/en/lint";
import es from "@/i18n/messages/es/lint";
import fr from "@/i18n/messages/fr/lint";
import { emptyResume, newBullet, newExperience } from "@/lib/resume/schema";
import { lintBullet, lintResume } from "./bullets";
import { entryChecks } from "./entry-checks";
import { ISSUE_HELP } from "./explain";
import { issueText, joinList } from "./i18n";
import { makeIssue } from "./issue";
import { punctuationIssues } from "./punctuation";
import { reviewResume } from "./review";
import type { LintIssue, LintIssueId, ResumeLint } from "./types";

const LINES = [
  "Responsible for managing the company website",
  "Results-driven team player passionate about clean code",
  "Hard-working self-starter with a strong work ethic",
  "I built the billing system for 40 clients",
  "We shipped the new app to 2 million users",
  "Worked on various things",
  "The database was migrated to Postgres in 2022 by the team",
  "Assisted with onboarding of 12 new hires",
  "Handled 20 support tickets a day etc.",
  "Led several projects for numerous clients",
  "Fixed bugs",
  "Improved the checkout flow for new shoppers",
  "Wrote guides that the support team used in onboarding",
  "Increased sales 20% last year",
  "Ran payroll and other stuff for the team",
  Array.from({ length: 40 }, () => "word").join(" "),
  `Built ${"a".repeat(230)}`,
];

describe("the lint namespace in English", () => {
  it("rebuilds every issue message exactly", () => {
    const issues = [
      ...LINES.flatMap((line) => lintBullet(line)),
      ...lintBullet("Build internal tools in React for 3 teams", { kind: "work", ended: true }),
    ];
    expect(new Set(issues.map((issue) => issue.messageId)).size).toBeGreaterThan(15);
    for (const issue of issues) expect(issueText(issue, en, "en")).toBe(issue.message);
  });

  it("rebuilds duplicate and full-stop messages", () => {
    const job = {
      ...newExperience(),
      bullets: ["Cut costs 20% for 3 teams.", "Cut costs 20% for 3 teams.", "Led 3 hires"].map(
        (text) => newBullet(text),
      ),
    };
    const lint = lintResume({ ...emptyResume(0), experience: [job] });
    const issues = Object.values(lint.byBullet).flat();
    expect(issues.map((issue) => issue.messageId)).toEqual(
      expect.arrayContaining(["duplicate", "stopMost"]),
    );
    for (const issue of issues) expect(issueText(issue, en, "en")).toBe(issue.message);
    for (const lines of [
      [
        { id: "a", text: "One." },
        { id: "b", text: "Two" },
      ],
      [
        { id: "a", text: "One" },
        { id: "b", text: "Two." },
      ],
      [
        { id: "a", text: "One" },
        { id: "b", text: "Two" },
        { id: "c", text: "Three." },
      ],
    ]) {
      for (const issue of punctuationIssues(lines).values()) {
        expect(issueText(issue, en, "en")).toBe(issue.message);
      }
    }
  });

  it("holds the same help as ISSUE_HELP", () => {
    for (const [id, help] of Object.entries(ISSUE_HELP) as [
      LintIssueId,
      (typeof ISSUE_HELP)[LintIssueId],
    ][]) {
      const words: { why: string; before?: string; after?: string } = en.help[id];
      expect(words.why).toBe(help.why);
      expect(words.before ?? null).toBe(help.example?.before ?? null);
      expect(words.after ?? null).toBe(help.example?.after ?? null);
    }
  });

  it("holds the entry checks' labels", () => {
    const checks = entryChecks(
      [
        { id: "a", issues: [] },
        { id: "b", issues: [] },
      ],
      true,
    );
    for (const check of checks) expect(en.checks[check.id]).toBe(check.label);
  });

  it("holds the review's group titles and reasons", () => {
    const job = {
      ...newExperience(),
      bullets: ["One line", "Two line", "Three line"].map((t) => newBullet(t)),
    };
    const resume = {
      ...emptyResume(0),
      basics: { ...emptyResume(0).basics, headline: "Engineer" },
      experience: [job],
    };
    for (const id of Object.keys(en.review.groups) as (keyof typeof en.review.groups)[]) {
      for (const count of [1, 3]) {
        const issue = makeIssue(id, "low", { text: "x", id: "noResult", params: {} }, null);
        const flagged = job.bullets
          .slice(0, count)
          .map((bullet) => [bullet.id, [issue]] as [string, LintIssue[]]);
        const lint: ResumeLint = {
          byBullet: Object.fromEntries(flagged),
          totals: { bullets: 3, withIssues: count, withNumbers: 0, highSeverity: 0 },
        };
        const item = reviewResume(resume, lint).items.find((entry) => entry.id === id);
        const group = en.review.groups[id];
        expect(item?.title).toBe(fmt(selectPlural("en", group.title, count), { count }));
        expect(item?.reason).toBe(group.reason);
      }
    }
  });
});

describe("issueText in other languages", () => {
  it("quotes and lists the way each language does", () => {
    const [stock] = lintBullet("Results-driven team player passionate about clean code").filter(
      (issue) => issue.id === "stock-phrase",
    );
    expect(issueText(stock!, es, "es")).toBe(
      "“Results-driven”, “team player” y “passionate about” son frases que los reclutadores pasan por alto. Muestra el resultado.",
    );
    expect(issueText(stock!, de, "de")).toBe(
      "„Results-driven“, „team player“ und „passionate about“ sind Floskeln, die Recruiter überlesen. Zeig lieber das Ergebnis.",
    );
  });

  it("fills a Spanish line's own words into a French message", () => {
    const [duty] = lintBullet("Responsable de la atención al cliente en la zona norte", {
      kind: "work",
      lang: "es",
    });
    expect(issueText(duty!, fr, "fr")).toBe(
      "« Responsable de » ressemble à une fiche de poste. Dis ce que tu as fait et ce qui a changé.",
    );
  });

  it("formats counts for the language", () => {
    const [long] = lintBullet(`Built ${"a".repeat(1_000)}`).filter(
      (issue) => issue.id === "too-long",
    );
    expect(issueText(long!, de, "de")).toContain("1.006 Zeichen");
    expect(issueText(long!, en, "en")).toContain("1006 characters");
  });

  it("keeps the English message for an issue without an id", () => {
    const plain: LintIssue = { id: "duty", severity: "high", message: "As written", match: null };
    expect(issueText(plain, es, "es")).toBe("As written");
  });

  it("joins lists with 'and' or 'or'", () => {
    expect(joinList(["a", "b", "c"], "en")).toBe("a, b and c");
    expect(joinList(["a", "b", "c"], "en", "disjunction")).toBe("a, b or c");
    expect(joinList(["a", "b"], "pt-BR")).toBe("a e b");
    expect(joinList(["a"], "fr")).toBe("a");
  });
});
