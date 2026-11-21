import { describe, expect, it } from "vitest";
import { emptyResume } from "@/lib/resume/schema";
import {
  AnswerRequestSchema,
  CheckoutRequestSchema,
  DraftRequestSchema,
  FixRequestSchema,
  GoogleSignInSchema,
  JobRequestSchema,
  OutreachRequestSchema,
  RequestCodeSchema,
  SummaryRequestSchema,
  TailorRequestSchema,
  VerifyCodeSchema,
} from "./types";

const JOB_TEXT =
  "We are hiring a product designer to lead research, prototyping and design reviews across our mobile apps.";

const messagesOf = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message) ?? [];

describe("FixRequestSchema", () => {
  const role = { title: "Designer", company: "Acme" };

  it("trims the line and starts with no answers", () => {
    expect(FixRequestSchema.parse({ bullet: "  Led the redesign  ", role })).toEqual({
      bullet: "Led the redesign",
      role,
      answers: [],
    });
  });

  it("turns away a blank line, an overlong one, and more than five answers", () => {
    expect(FixRequestSchema.safeParse({ bullet: "   ", role }).success).toBe(false);
    expect(FixRequestSchema.safeParse({ bullet: "x".repeat(601), role }).success).toBe(false);
    const answers = Array.from({ length: 6 }, () => ({ question: "How many?", answer: "Ten" }));
    expect(FixRequestSchema.safeParse({ bullet: "Led it", role, answers }).success).toBe(false);
    expect(
      FixRequestSchema.safeParse({ bullet: "Led it", role, answers: answers.slice(1) }).success,
    ).toBe(true);
  });
});

describe("TailorRequestSchema and the schemas built on it", () => {
  const resume = emptyResume(1_000);

  it("takes a job post of 80 characters or more and fills in a missing title and company", () => {
    const parsed = TailorRequestSchema.parse({ resume, job: { text: `  ${JOB_TEXT}  ` } });
    expect(parsed.job).toEqual({ text: JOB_TEXT, title: "", company: "" });
  });

  it("turns away a job post too short to tailor to", () => {
    expect(
      TailorRequestSchema.safeParse({ resume, job: { text: "Designer wanted." } }).success,
    ).toBe(false);
  });

  it("needs an application question of at least 8 characters", () => {
    const job = { text: JOB_TEXT };
    expect(AnswerRequestSchema.safeParse({ resume, job, question: "  Why us?     " }).success).toBe(
      false,
    );
    expect(AnswerRequestSchema.parse({ resume, job, question: "  Why us, Ada?  " }).question).toBe(
      "Why us, Ada?",
    );
  });

  it("follows up only after a whole number of days from 1 on", () => {
    const job = { text: JOB_TEXT };
    expect(OutreachRequestSchema.parse({ resume, job }).followUp).toBeUndefined();
    expect(OutreachRequestSchema.parse({ resume, job, followUp: { days: 7 } }).followUp).toEqual({
      days: 7,
    });
    for (const days of [0, 2.5, 36_501]) {
      expect(OutreachRequestSchema.safeParse({ resume, job, followUp: { days } }).success).toBe(
        false,
      );
    }
  });
});

describe("SummaryRequestSchema", () => {
  it("writes from a resume or improves a summary of 15 to 3,000 characters", () => {
    expect(
      SummaryRequestSchema.safeParse({ mode: "write", resume: emptyResume(1_000) }).success,
    ).toBe(true);
    expect(
      SummaryRequestSchema.parse({ mode: "improve", summary: "  Designer of 8 years.  " }),
    ).toEqual({
      mode: "improve",
      summary: "Designer of 8 years.",
    });
    expect(SummaryRequestSchema.safeParse({ mode: "improve", summary: "Designer." }).success).toBe(
      false,
    );
    expect(
      SummaryRequestSchema.safeParse({ mode: "improve", summary: "x".repeat(3_001) }).success,
    ).toBe(false);
    expect(
      SummaryRequestSchema.safeParse({ mode: "rewrite", summary: "Designer of 8 years." }).success,
    ).toBe(false);
  });
});

describe("sign-in schemas", () => {
  it("needs a real email address", () => {
    expect(RequestCodeSchema.safeParse({ email: "ada@example.com" }).success).toBe(true);
    expect(RequestCodeSchema.safeParse({ email: "ada" }).success).toBe(false);
    expect(RequestCodeSchema.safeParse({ email: `${"a".repeat(250)}@example.com` }).success).toBe(
      false,
    );
  });

  it("needs exactly six digits for the code, and says so", () => {
    expect(VerifyCodeSchema.safeParse({ email: "ada@example.com", code: "123456" }).success).toBe(
      true,
    );
    for (const code of ["12345", "1234567", "12345a", " 123456"]) {
      const result = VerifyCodeSchema.safeParse({ email: "ada@example.com", code });
      expect(messagesOf(result)).toEqual(["Enter the 6-digit code."]);
    }
  });

  it("takes Google sign-in with or without a page to come back to", () => {
    expect(GoogleSignInSchema.parse({})).toEqual({});
    expect(GoogleSignInSchema.parse({ next: "/studio" })).toEqual({ next: "/studio" });
    expect(GoogleSignInSchema.safeParse({ next: `/${"x".repeat(512)}` }).success).toBe(false);
  });
});

describe("DraftRequestSchema", () => {
  const job = { company: "Acme", title: "Designer", startDate: "2020", endDate: "Present" };

  it("drops blank notes and keeps the rest trimmed", () => {
    const parsed = DraftRequestSchema.parse({
      targetRole: " Product designer ",
      jobs: [{ ...job, notes: ["  Led the redesign ", "   ", ""] }],
    });
    expect(parsed.targetRole).toBe("Product designer");
    expect(parsed.jobs[0]?.notes).toEqual(["Led the redesign"]);
  });

  it("asks for at least one thing done in each job", () => {
    const result = DraftRequestSchema.safeParse({
      targetRole: "Product designer",
      jobs: [{ ...job, notes: ["  ", ""] }],
    });
    expect(messagesOf(result)).toEqual(["Add at least one thing you did."]);
  });

  it("needs a target role and one to six jobs", () => {
    const notes = ["Led the redesign"];
    expect(
      DraftRequestSchema.safeParse({ targetRole: " ", jobs: [{ ...job, notes }] }).success,
    ).toBe(false);
    expect(DraftRequestSchema.safeParse({ targetRole: "Designer", jobs: [] }).success).toBe(false);
    const seven = Array.from({ length: 7 }, () => ({ ...job, notes }));
    expect(DraftRequestSchema.safeParse({ targetRole: "Designer", jobs: seven }).success).toBe(
      false,
    );
    expect(
      DraftRequestSchema.safeParse({ targetRole: "Designer", jobs: seven.slice(1) }).success,
    ).toBe(true);
  });
});

describe("CheckoutRequestSchema", () => {
  it("buys Pro monthly unless told otherwise", () => {
    expect(CheckoutRequestSchema.parse({})).toEqual({ plan: "pro", interval: "month" });
    expect(CheckoutRequestSchema.parse({ plan: "max", interval: "year", next: "/studio" })).toEqual(
      {
        plan: "max",
        interval: "year",
        next: "/studio",
      },
    );
  });

  it("turns away a plan or interval that can't be bought", () => {
    expect(CheckoutRequestSchema.safeParse({ plan: "free" }).success).toBe(false);
    expect(CheckoutRequestSchema.safeParse({ interval: "week" }).success).toBe(false);
    expect(CheckoutRequestSchema.safeParse({ next: `/${"x".repeat(512)}` }).success).toBe(false);
  });
});

describe("JobRequestSchema", () => {
  it("takes a link of up to 2,048 characters", () => {
    expect(JobRequestSchema.safeParse({ url: "https://jobs.example/1" }).success).toBe(true);
    expect(
      JobRequestSchema.safeParse({ url: `https://jobs.example/${"x".repeat(2_048)}` }).success,
    ).toBe(false);
    expect(JobRequestSchema.safeParse({}).success).toBe(false);
  });
});
