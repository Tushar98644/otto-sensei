import { describe, expect, it } from "vitest";
import {
  checkProse,
  clichesIn,
  clipToWords,
  dropClichedSentences,
  problemScore,
  retryNotes,
  sentencesOf,
  unbackedIn,
  unwrapKnown,
  upgradedVerbs,
  wordCount,
} from "./writing-guards";

const RESUME = [
  "Sam Rivera",
  "Rebuilt the billing service in Go, cutting p99 latency by 40%",
  "Helped with the quarterly customer newsletter",
  "Supported the move of 12 services to Kubernetes",
  "Led the on-call rotation for 6 services",
].join("\n");
const LINES = RESUME.split("\n").slice(1);

describe("sentencesOf and wordCount", () => {
  it("splits on sentence ends without breaking decimals or names", () => {
    expect(sentencesOf("I kept 99.9% uptime on Node.js. Then I moved on! Why? Because.")).toEqual([
      "I kept 99.9% uptime on Node.js.",
      "Then I moved on!",
      "Why?",
      "Because.",
    ]);
    expect(wordCount("I'd rebuild it in Go, again.")).toBe(6);
  });
});

describe("unwrapKnown", () => {
  it("takes brackets off numbers and names the sources contain", () => {
    expect(unwrapKnown("Cut p99 latency by [40%] at [Kestrel Labs].", [RESUME, "Kestrel Labs"])).toBe(
      "Cut p99 latency by 40% at Kestrel Labs.",
    );
  });

  it("keeps real blanks and unknown numbers bracketed", () => {
    const text = "I can start [your start date] and cut costs by [30%] for [number] teams.";
    expect(unwrapKnown(text, [RESUME])).toBe(text);
  });
});

describe("clichesIn and dropClichedSentences", () => {
  it("names the stock phrases a draft uses", () => {
    expect(
      clichesIn("I am writing to express my interest. I'm passionate about it and excited to leverage Go."),
    ).toEqual(["I am writing to", "express my interest", "passionate", "excited to", "leverage"]);
    expect(clichesIn("I rebuilt the billing service in Go.")).toEqual([]);
  });

  it("drops stock-phrase sentences when the text can spare them", () => {
    const paragraphs = [
      "I am writing to apply for the Backend Engineer role. I rebuilt the billing service in Go.",
      "I'm passionate about reliability.",
      "I led the on-call rotation for 6 services and kept it calm.",
    ];
    expect(dropClichedSentences(paragraphs, 10)).toEqual({
      paragraphs: [
        "I rebuilt the billing service in Go.",
        "I led the on-call rotation for 6 services and kept it calm.",
      ],
      dropped: 2,
    });
    // Cutting would leave less than the floor, so the draft stays as it was.
    expect(dropClichedSentences(paragraphs, 40)).toEqual({ paragraphs, dropped: 0 });
  });
});

describe("upgradedVerbs", () => {
  it("catches a stronger verb than the resume line it restates", () => {
    expect(
      upgradedVerbs("I wrote and published the quarterly customer newsletter for two years.", LINES),
    ).toEqual([
      { verb: "wrote", line: "Helped with the quarterly customer newsletter" },
      { verb: "published", line: "Helped with the quarterly customer newsletter" },
    ]);
    expect(upgradedVerbs("I led the move of 12 services to Kubernetes.", LINES)).toEqual([
      { verb: "led", line: "Supported the move of 12 services to Kubernetes" },
    ]);
  });

  it("accepts the resume's own verb, in any tense, and lines that already own the work", () => {
    expect(upgradedVerbs("I helped with the quarterly customer newsletter.", LINES)).toEqual([]);
    expect(upgradedVerbs("I lead the on-call rotation for 6 services.", LINES)).toEqual([]);
    expect(upgradedVerbs("I built a great team culture.", LINES)).toEqual([]);
  });
});

describe("clipToWords", () => {
  it("keeps whole sentences up to the limit", () => {
    const paragraphs = ["One two three. Four five six.", "Seven eight nine."];
    expect(clipToWords(paragraphs, 6)).toEqual(["One two three. Four five six."]);
    expect(clipToWords(paragraphs, 7)).toEqual(["One two three. Four five six."]);
    expect(clipToWords(paragraphs, 9)).toEqual(paragraphs);
    expect(clipToWords(paragraphs, 4)).toEqual(["One two three."]);
  });
});

describe("checkProse", () => {
  it("unwraps real numbers, masks invented ones and reports what's left", () => {
    const check = checkProse(
      [
        "  I cut p99 latency by [40%] and grew revenue 3x.  ",
        "I wrote the quarterly customer newsletter. I'm passionate about it.",
        "   ",
      ],
      [RESUME],
      LINES,
    );
    expect(check.paragraphs).toEqual([
      "I cut p99 latency by 40% and grew revenue [number].",
      "I wrote the quarterly customer newsletter. I'm passionate about it.",
    ]);
    expect(check.maskedNumbers).toBe(1);
    expect(check.placeholders).toEqual(["[number]"]);
    expect(check.cliches).toEqual(["passionate"]);
    expect(check.upgrades).toEqual([
      { verb: "wrote", line: "Helped with the quarterly customer newsletter" },
    ]);
    expect(check.unbacked).toEqual([]);
    const range = { min: 5, max: 100 };
    expect(retryNotes(check, range)).toEqual([
      'Don\'t use these stock phrases: "passionate".',
      'You wrote "wrote", but the resume line says: "Helped with the quarterly customer newsletter". Use the resume\'s own verb for that work.',
      "Use only numbers that appear in the resume, written as they are there.",
    ]);
    expect(problemScore(check, range)).toBe(5);
  });
});

describe("upgradedVerbs on real resume shapes", () => {
  const lines = [
    "Results-driven product marketer. I turn complex features into clear stories that help sales teams win deals.",
    "Led the launch of an analytics add-on that reached 1,200 paying teams",
    "Responsible for creating sales enablement materials for the sales team",
    "I worked closely with product managers to define messaging for various new features",
    "Helped with the company blog and social media channels",
  ];

  it("doesn't read 'help sales teams' later in a line as a supporting role", () => {
    expect(upgradedVerbs("I've been launching analytics products that help sales teams win deals.", lines)).toEqual([]);
  });

  it("catches a claim built from a supporting line, even when merged with another one", () => {
    expect(upgradedVerbs("I wrote and ran the company blog and its social media channels.", lines)).toEqual([
      { verb: "wrote", line: "Helped with the company blog and social media channels" },
      { verb: "ran", line: "Helped with the company blog and social media channels" },
    ]);
    expect(
      upgradedVerbs("I built the messaging with product managers for new features, and the add-on reached 1,200 paying teams.", lines),
    ).toEqual([{ verb: "built", line: "I worked closely with product managers to define messaging for various new features" }]);
  });
});

describe("upgradedVerbs and leadership claims", () => {
  it("needs a resume line that says the person led, whatever that line's role", () => {
    const lines = ["Rebuilt the pricing page with the design and growth teams", "Led the launch of the add-on"];
    expect(upgradedVerbs("The pricing work lines up with the pricing page project I led.", lines)).toEqual([
      { verb: "led", line: "Rebuilt the pricing page with the design and growth teams" },
    ]);
    expect(upgradedVerbs("I led the launch of the add-on.", lines)).toEqual([]);
    expect(upgradedVerbs("I rebuilt the pricing page with the growth team.", lines)).toEqual([]);
  });
});

describe("unbackedIn", () => {
  it("flags lessons and time spans only the person can know", () => {
    expect(
      unbackedIn("That work taught me a lot. I've been doing it for the last several years."),
    ).toEqual(["taught me", "for the last few years"]);
    expect(unbackedIn("I ran the weekly on-call rotation for 6 services.")).toEqual([]);
    expect(unbackedIn("I use HubSpot and Salesforce daily.")).toEqual(["daily"]);
  });

  it("leaves phrases the resume uses, and sentences the person still has to finish", () => {
    expect(unbackedIn("I check the dashboards daily.", ["Checked the launch dashboards daily"])).toEqual([]);
    expect(unbackedIn("Looking back, I'd change [what you'd change].")).toEqual([]);
  });
});
