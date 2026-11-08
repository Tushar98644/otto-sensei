import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DraftRequestSchema, type DraftRequest } from "@/lib/api/types";
import { resetEnvForTests } from "@/lib/env";
import { ResumeSchema } from "@/lib/resume/schema";
import type { StructuredRequest } from "./client";
import { AIError } from "./types";
import { checkedBullet, draftResume } from "./draft";

const runStructured = vi.hoisted(() => vi.fn<(request: StructuredRequest<unknown>) => Promise<unknown>>());
vi.mock("./client", () => ({ runStructured }));

const NOW = Date.UTC(2026, 10, 7);

const INPUT: DraftRequest = DraftRequestSchema.parse({
  targetRole: "Customer Success Manager",
  jobs: [
    {
      company: "Contoso",
      title: "Support Specialist",
      startDate: "Mar 2023",
      endDate: "",
      notes: ["answered about 40 customer emails a day in Zendesk", "helped train new hires", ""],
    },
    {
      company: "Fabrikam Cafe",
      title: "Barista",
      startDate: "2021",
      endDate: "2023",
      notes: ["opened the shop on weekends"],
    },
  ],
});

function useKey(key: string | null) {
  if (key) process.env.OPENROUTER_API_KEY = key;
  else delete process.env.OPENROUTER_API_KEY;
  resetEnvForTests();
}

beforeEach(() => {
  useKey("test-key");
  runStructured.mockReset();
});

afterEach(() => useKey(null));

describe("draftResume", () => {
  it("uses the person's own lines when the AI is off", async () => {
    useKey(null);
    const { resume, usedAI } = await draftResume(INPUT, NOW);
    expect(usedAI).toBe(false);
    expect(runStructured).not.toHaveBeenCalled();
    expect(ResumeSchema.safeParse(resume).success).toBe(true);
    expect(resume.basics.headline).toBe("Customer Success Manager");
    expect(resume.experience[0]).toMatchObject({ company: "Contoso", endDate: "Present" });
    expect(resume.experience[0]?.bullets.map((b) => b.text)).toEqual([
      "Answered about 40 customer emails a day in Zendesk",
      "Helped train new hires",
    ]);
  });

  it("keeps checked AI lines and turns down invented facts", async () => {
    runStructured.mockResolvedValue({
      headline: "Customer Success Manager",
      summary: "Support specialist who answers 40 customer emails a day. Led a team of 12 agents.",
      jobs: [
        // The second line claims charge of training the note only helped with.
        { index: 0, bullets: ["Answered 40 customer emails a day in Zendesk, cutting wait times by 30%", "Led onboarding for new hires"] },
        { index: 1, bullets: ["Opened the shop on weekends"] },
      ],
      skills: ["Zendesk", "Salesforce"],
    });
    const { resume, usedAI } = await draftResume(INPUT, NOW);
    expect(usedAI).toBe(true);
    const request = runStructured.mock.calls[0]?.[0];
    expect(request?.user).toContain("<experience>");
    // Names and contact details are never part of the request.
    expect(request?.user).not.toContain("@");

    expect(resume.experience[0]?.bullets.map((b) => b.text)).toEqual([
      "Answered 40 customer emails a day in Zendesk, cutting wait times by [number]",
      "Helped train new hires",
    ]);
    expect(resume.experience[1]?.bullets.map((b) => b.text)).toEqual(["Opened the shop on weekends"]);
    expect(resume.summary).toContain("40 customer emails");
    expect(resume.summary).not.toContain("Led");
    expect(resume.skills[0]?.items).toEqual(["Zendesk"]);
  });

  it("hides an email, phone number or link typed into a note, and puts it back", async () => {
    const input = DraftRequestSchema.parse({
      targetRole: "Support Lead",
      jobs: [
        {
          company: "Contoso",
          title: "Support Specialist",
          startDate: "2023",
          endDate: "",
          notes: ["ran the help desk at help@contoso-support.com", "wrote the guide at contoso.dev/help/guide"],
        },
      ],
    });
    runStructured.mockResolvedValue({
      headline: "Support Lead",
      summary: "",
      jobs: [{ index: 0, bullets: ["Ran the help desk at [EMAIL_1]", "Wrote the guide at [LINK_1]"] }],
      skills: [],
    });
    const { resume } = await draftResume(input, NOW);
    const sent = runStructured.mock.calls[0]?.[0]?.user ?? "";
    expect(sent).not.toContain("help@contoso-support.com");
    expect(sent).not.toContain("contoso.dev/help/guide");
    expect(sent).toContain("[EMAIL_1]");
    expect(resume.experience[0]?.bullets.map((b) => b.text)).toEqual([
      "Ran the help desk at help@contoso-support.com",
      "Wrote the guide at contoso.dev/help/guide",
    ]);
  });

  it("falls back to the typed lines when the AI fails", async () => {
    runStructured.mockRejectedValue(new AIError("unavailable", "down"));
    const { resume, usedAI } = await draftResume(INPUT, NOW);
    expect(usedAI).toBe(false);
    expect(resume.experience[1]?.bullets[0]?.text).toBe("Opened the shop on weekends");
  });
});

describe("checkedBullet", () => {
  it("drops a summary sentence that retells a 'helped' note without the help", async () => {
    runStructured.mockResolvedValue({
      headline: "Customer Success Manager",
      summary: "Answers 40 customer emails a day in Zendesk. Also trained new hires.",
      jobs: [],
      skills: [],
    });
    const { resume } = await draftResume(INPUT, NOW);
    expect(resume.summary).toBe("Answers 40 customer emails a day in Zendesk.");
  });

  it("keeps the note when the rewrite drops 'helped'", () => {
    expect(checkedBullet("Trained new hires", "helped train new hires", ["helped train new hires"])).toBe(
      "Helped train new hires",
    );
  });
});
