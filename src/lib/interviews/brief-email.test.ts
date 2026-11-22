import { describe, expect, it } from "vitest";
import type { InterviewPrep } from "@/lib/insights/prep";
import { briefEmail, briefLead, storyLine, type AskItem, type BriefItem } from "./brief-email";

const LINKS = {
  ottoHeadUrl: "https://otto.test/email/otto-head.png",
  settingsUrl: "https://otto.test/dashboard/account#reminders",
  unsubscribeUrl: "https://otto.test/api/notifications/unsubscribe?u=1&t=x&l=briefs",
};

const PREP: InterviewPrep = {
  version: 2,
  job: { title: "Product Designer", company: "Stripe" },
  questions: [
    { round: "fit", question: "Why Stripe?", checking: "", followUp: "", points: [], story: null },
    {
      round: "fit",
      question: "Walk me through a launch.",
      checking: "",
      followUp: "",
      points: [],
      story: 0,
    },
    {
      round: "fit",
      question: "How do you handle <pushback>?",
      checking: "",
      followUp: "",
      points: [],
      story: null,
    },
    { round: "fit", question: "A fourth one", checking: "", followUp: "", points: [], story: null },
  ],
  stories: [
    {
      title: "The checkout redesign",
      line: "Cut checkout steps from 5 to 2",
      place: "",
      situation: "",
      task: "",
      action: "",
      result: "",
    },
  ],
  asks: ["What does success look like in 90 days?", "How does design work with engineering?"],
  createdAt: 1,
  demo: false,
};

function brief(overrides: Partial<BriefItem> = {}): BriefItem {
  return {
    company: "Stripe",
    role: "Product Designer",
    time: "2:30 PM",
    prep: PREP,
    prepUrl: "https://otto.test/dashboard/interview/a1",
    makeUrl: "https://otto.test/dashboard/applications/a1/prep?start=1",
    ...overrides,
  };
}

function ask(overrides: Partial<AskItem> = {}): AskItem {
  return {
    company: "Figma",
    role: "Designer",
    when: "yesterday",
    followUpDay: "Mon, Nov 30",
    answerUrl: "https://otto.test/dashboard/applications/b2",
    thankYouUrl: "https://otto.test/dashboard/applications/b2?write=thank-you",
    ...overrides,
  };
}

const input = (briefs: BriefItem[], asks: AskItem[] = []) => ({
  to: "maya@example.com",
  briefs,
  asks,
  interviewsUrl: "https://otto.test/dashboard/interview",
  links: LINKS,
});

describe("the interview morning brief", () => {
  it("leads with the company, role and time, then the pack's stories, questions and asks", () => {
    const email = briefEmail(input([brief()]));
    expect(email.subject).toBe("Today: your interview with Stripe at 2:30 PM");
    expect(email.text).toContain(
      "Your interview with Stripe is today at 2:30 PM, for the Product Designer role.",
    );
    expect(email.text).toContain(
      "Your strongest stories\n- The checkout redesign: Cut checkout steps from 5 to 2",
    );
    expect(email.text).toContain("Likely questions\n- Why Stripe?\n- Walk me through a launch.");
    expect(email.text).not.toContain("A fourth one");
    expect(email.text).toContain(
      "Questions to ask them\n- What does success look like in 90 days?",
    );
    expect(email.text).toContain("Open your prep: https://otto.test/dashboard/interview/a1");
    expect(email.html).toContain("How do you handle &lt;pushback&gt;?");
    expect(email.headers?.["List-Unsubscribe"]).toBe(`<${LINKS.unsubscribeUrl}>`);
    expect(email.tags).toEqual([{ name: "kind", value: "interview_brief" }]);
  });

  it("offers a one-click pack when there is none, and never starts one by itself", () => {
    const email = briefEmail(input([brief({ prep: null })]));
    expect(email.text).toContain("There's no prep pack for it yet.");
    expect(email.text).toContain(
      "Make my prep pack: https://otto.test/dashboard/applications/a1/prep?start=1",
    );
    expect(email.text).not.toContain("Likely questions");
  });

  it("sells nothing on a plan without prep", () => {
    const email = briefEmail(
      input([brief({ prep: null, makeUrl: null })], [ask({ thankYouUrl: null })]),
    );
    expect(email.text).not.toContain("start=1");
    expect(email.text).not.toContain("Write a thank-you");
    expect(email.text).toContain("Read the job post once more");
    expect(email.text).toContain("Open your interviews: https://otto.test/dashboard/interview");
  });

  it("reads each story once when its title only repeats the line's start, and puts the opener last", () => {
    expect(
      storyLine({
        title: "Cut support tickets by 30%",
        line: "Cut support tickets by 30% by rewriting errors",
      }),
    ).toBe("Cut support tickets by 30% by rewriting errors");
    expect(storyLine({ title: "Checkout", line: "Cut checkout steps" })).toBe(
      "Checkout: Cut checkout steps",
    );
    const opener = {
      round: "opening" as const,
      question: "Walk me through your background.",
      checking: "",
      followUp: "",
      points: [],
      story: null,
    };
    const email = briefEmail(
      input([brief({ prep: { ...PREP, questions: [opener, ...PREP.questions] } })]),
    );
    expect(email.text).not.toContain("Walk me through your background.");
  });

  it("says a day with no time plainly", () => {
    expect(briefLead({ company: "Stripe", role: "", time: null })).toBe(
      "Your interview with Stripe is today.",
    );
    expect(briefLead({ company: "", role: "Designer", time: "9:00 AM" })).toBe(
      "Your interview is today at 9:00 AM, for the Designer role.",
    );
  });

  it("asks how yesterday's went, with the thank-you and the follow-up day", () => {
    const email = briefEmail(input([], [ask()]));
    expect(email.subject).toBe("How did it go with Figma?");
    expect(email.text).toContain(
      "How did your interview with Figma go yesterday? I'll remind you to follow up on Mon, Nov 30 unless you hear back.",
    );
    expect(email.text).toContain(
      "Write a thank-you: https://otto.test/dashboard/applications/b2?write=thank-you",
    );
    expect(email.text).toContain(
      "Tell Otto how it went: https://otto.test/dashboard/applications/b2",
    );
  });

  it("puts today's interviews first and yesterday's after", () => {
    const email = briefEmail(input([brief(), brief({ company: "Linear", time: null })], [ask()]));
    expect(email.subject).toBe("Today: 2 interviews");
    expect(email.text.indexOf("Linear")).toBeLessThan(email.text.indexOf("And from before:"));
    expect(email.text.indexOf("And from before:")).toBeLessThan(email.text.indexOf("Figma"));
  });

  it("escapes what the person typed", () => {
    const email = briefEmail(input([brief({ company: "<b>Acme</b> & Co" })]));
    expect(email.html).toContain("&lt;b&gt;Acme&lt;/b&gt; &amp; Co");
    expect(email.html).not.toContain("<b>Acme");
  });
});
