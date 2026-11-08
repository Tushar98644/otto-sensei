import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetEnvForTests } from "@/lib/env";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import type { StructuredRequest } from "./client";
import { demoImprove, demoWrite, SUMMARY_CHARS, writeSummary } from "./summary";
import { AIError } from "./types";

const runStructured = vi.hoisted(() =>
  vi.fn<(request: StructuredRequest<unknown>) => Promise<unknown>>(),
);
vi.mock("./client", () => ({ runStructured }));

const NOW = Date.UTC(2026, 10, 7);

function resume(): Resume {
  const base = emptyResume(NOW);
  return {
    ...base,
    basics: {
      ...base.basics,
      name: "Jordan Ellis",
      email: "jordan@example.com",
      phone: "+1 555 0100",
      headline: "Backend Engineer",
    },
    summary: "",
    experience: [
      {
        id: "job1",
        title: "Backend Engineer",
        company: "Northwind",
        location: "",
        startDate: "2021",
        endDate: "Present",
        bullets: [
          { id: "b1", text: "Built the billing API in Go and PostgreSQL for 3 product teams" },
          { id: "b2", text: "Helped with the move of 40 services to AWS" },
          { id: "b3", text: "Cut checkout errors by 35% with retries and better alerts" },
        ],
      },
    ],
  };
}

function useKey(key: string | null) {
  if (key) process.env.OPENROUTER_API_KEY = key;
  else delete process.env.OPENROUTER_API_KEY;
  resetEnvForTests();
}

beforeEach(() => {
  runStructured.mockReset();
});

afterEach(() => {
  useKey(null);
});

describe("writeSummary with the model", () => {
  beforeEach(() => useKey("test-key"));

  it("returns both takes and never sends contact details", async () => {
    runStructured.mockResolvedValueOnce({
      achievements:
        "Backend engineer who cut checkout errors by 35% at Northwind. Built the billing API in Go and PostgreSQL for 3 product teams.",
      role: "Backend engineer at Northwind working in Go, PostgreSQL and AWS. Built the billing API for 3 product teams.",
    });
    const result = await writeSummary({ mode: "write", resume: resume() });

    expect(result.options.map((option) => option.kind)).toEqual(["achievements", "role"]);
    expect(result.options[0]?.text).toContain("35%");
    expect(result.options.every((option) => option.warnings.length === 0)).toBe(true);
    const request = runStructured.mock.calls[0]?.[0];
    expect(request?.task).toBe("fix");
    expect(request?.user).toContain("<resume>");
    expect(request?.user).not.toMatch(/Jordan|jordan@example\.com|555 0100/);
  });

  it("hides a name, email or link written inside a line too", async () => {
    const withLink = resume();
    const job = withLink.experience[0];
    if (job) {
      job.bullets = [
        ...job.bullets,
        { id: "b4", text: "Wrote the Jordan Ellis API guide at jordanellis.dev/guide, emailed to jordan@example.com" },
      ];
    }
    runStructured.mockResolvedValueOnce({
      achievements: "Backend engineer who cut checkout errors by 35% at Northwind. Built the billing API in Go.",
      role: "Backend engineer at Northwind working in Go and PostgreSQL. Built the billing API for 3 product teams.",
    });
    await writeSummary({ mode: "write", resume: withLink });
    const sent = runStructured.mock.calls[0]?.[0]?.user ?? "";
    expect(sent).not.toMatch(/Jordan|Ellis|jordanellis\.dev|jordan@example\.com/);
    expect(sent).toContain("[LINK_");
  });

  it("masks numbers the resume doesn't have and says so", async () => {
    runStructured.mockResolvedValueOnce({
      achievements:
        "Backend engineer who cut checkout errors by 60% at Northwind. Built the billing API in Go and PostgreSQL.",
      role: "Backend engineer at Northwind who built the billing API in Go and PostgreSQL.",
    });
    const { options } = await writeSummary({ mode: "write", resume: resume() });

    expect(options[0]?.text).toContain("[number]");
    expect(options[0]?.text).not.toContain("60");
    expect(options[0]?.warnings.join(" ")).toMatch(/real figure/);
  });

  it("drops a take that describes someone else", async () => {
    runStructured.mockResolvedValueOnce({
      achievements:
        "Visionary marketing leader driving brand strategy across global consumer campaigns, influencer partnerships and retail growth.",
      role: "Backend engineer at Northwind who built the billing API in Go and PostgreSQL.",
    });
    const { options } = await writeSummary({ mode: "write", resume: resume() });
    expect(options.map((option) => option.kind)).toEqual(["role"]);
  });

  it("fails when neither take stays with the facts", async () => {
    const invented =
      "Visionary marketing leader driving brand strategy across global consumer campaigns and retail growth.";
    runStructured.mockResolvedValueOnce({ achievements: invented, role: invented });
    await expect(writeSummary({ mode: "write", resume: resume() })).rejects.toMatchObject({
      code: "invalid_output",
    });
  });

  it("warns about stronger verbs and stock phrases instead of hiding them", async () => {
    runStructured.mockResolvedValueOnce({
      achievements:
        "Results-driven backend engineer at Northwind. Led the move of 40 services to AWS and built the billing API.",
      role: "Backend engineer at Northwind who built the billing API in Go and PostgreSQL.",
    });
    const { options } = await writeSummary({ mode: "write", resume: resume() });
    const warnings = options[0]?.warnings.join(" ") ?? "";
    expect(warnings).toMatch(/results-driven/i);
    expect(warnings).toMatch(/“led”/i);
  });

  it("keeps at most 3 sentences and the length cap", async () => {
    const sentence = "Backend engineer at Northwind who built the billing API in Go and PostgreSQL.";
    runStructured.mockResolvedValueOnce({
      achievements: Array.from({ length: 6 }, () => sentence).join(" "),
      role: sentence,
    });
    const { options } = await writeSummary({ mode: "write", resume: resume() });
    expect(options[0]?.text.split(". ").length).toBeLessThanOrEqual(3);
    expect(options[0]?.text.length).toBeLessThanOrEqual(SUMMARY_CHARS);
  });

  it("doesn't call the model for a resume with nothing to summarize", async () => {
    const result = await writeSummary({ mode: "write", resume: emptyResume(NOW) });
    expect(result.options).toEqual([]);
    expect(runStructured).not.toHaveBeenCalled();
  });

  it("tightens only the person's own words and sends nothing else", async () => {
    const own =
      "I am a very hard-working backend engineer who is responsible for building APIs in Go for payment teams.";
    runStructured.mockResolvedValueOnce({ summary: "Backend engineer building APIs in Go for payment teams." });
    const result = await writeSummary({ mode: "improve", summary: own });

    expect(result.options).toEqual([
      { kind: "tightened", text: "Backend engineer building APIs in Go for payment teams.", warnings: [] },
    ]);
    const request = runStructured.mock.calls[0]?.[0];
    expect(request?.user).toContain("<line>");
    expect(request?.user).not.toContain("<resume>");
  });

  it("hides an email or link in the summary being tightened, and puts it back", async () => {
    const own = "Backend engineer building APIs in Go for payment teams. Portfolio at jordanellis.dev/work.";
    runStructured.mockResolvedValueOnce({
      summary: "Backend engineer building Go APIs for payment teams. Portfolio at [LINK_1].",
    });
    const result = await writeSummary({ mode: "improve", summary: own });
    expect(runStructured.mock.calls[0]?.[0]?.user).not.toContain("jordanellis.dev");
    expect(result.options[0]?.text).toContain("jordanellis.dev/work");
  });

  it("refuses a tightened summary that adds facts", async () => {
    runStructured.mockResolvedValueOnce({
      summary: "Award-winning staff engineer leading Kubernetes platforms and machine learning infrastructure at scale.",
    });
    await expect(
      writeSummary({ mode: "improve", summary: "Backend engineer building APIs in Go for payment teams." }),
    ).rejects.toBeInstanceOf(AIError);
  });

  it("passes model failures through", async () => {
    runStructured.mockRejectedValueOnce(new AIError("refused", "no"));
    await expect(writeSummary({ mode: "write", resume: resume() })).rejects.toMatchObject({ code: "refused" });
  });
});

describe("writeSummary in demo mode", () => {
  beforeEach(() => useKey(null));

  it("builds both takes from the resume's own lines", async () => {
    const { options } = await writeSummary({ mode: "write", resume: resume() });
    expect(options).toEqual(demoWrite(resume()));
    expect(options[0]?.text).toContain("Built the billing API in Go and PostgreSQL for 3 product teams.");
    expect(options[1]?.text).toMatch(/^Backend Engineer at Northwind\./);
    expect(runStructured).not.toHaveBeenCalled();
  });

  it("tightens without adding words", () => {
    const own = "I am a very hard-working backend engineer. Ships APIs in Go.";
    const { text } = demoImprove(own);
    expect(text).toBe("Backend engineer. Ships APIs in Go.");
  });
});
