import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LETTER_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import type { CoverLetterResult, OutreachResult } from "@/lib/ai/types";
import { assembleLetter } from "@/lib/ai/writing";
import { resetEnvForTests } from "@/lib/env";
import { DEFAULT_WRITING_STYLE } from "@/lib/writing-style/schema";
import { tokensOf } from "../../../scripts/evals/cost";
import { dryRun, estimateCase } from "../../../scripts/evals/harness";
import { lettersSuite } from "../../../scripts/evals/suites/letters";
import { LETTER_CASES, OUTREACH_CASES } from "../../../scripts/evals/suites/letters/cases";
import {
  apologies,
  bodyLength,
  bodyOf,
  bodyOnly,
  copiedFromPost,
  grounded,
  honesty,
  namesCompany,
  namesRole,
  outreachParts,
  paragraphs,
  postSpecific,
  resultShape,
  resumeFacts,
  roleShare,
  sentenceLength,
  styleRules,
  termIn,
  unshownClaims,
  type LettersCase,
  type LettersOutput,
} from "../../../scripts/evals/suites/letters/graders";
import type { Grade } from "./graders";

const writing = vi.hoisted(() => ({
  writeCoverLetter: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  writeOutreach: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
}));
vi.mock("@/lib/ai/writing", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/writing")>()),
  ...writing,
}));

type LettersGrader = (output: LettersOutput, kase: LettersCase) => Grade | readonly Grade[];
type Message = { subject: string; email: readonly string[]; note: string };

const ALL = [...LETTER_CASES, ...OUTREACH_CASES];

function byId(id: string): LettersCase {
  const kase = ALL.find((entry) => entry.id === id);
  if (!kase) throw new Error(`no case "${id}"`);
  return kase;
}

function withInput(kase: LettersCase, change: Partial<LettersCase["input"]>): LettersCase {
  return { ...kase, input: { ...kase.input, ...change } };
}

function letter(kase: LettersCase, body: readonly string[]): LettersOutput {
  const { resume, job } = kase.input;
  return { letter: assembleLetter(body, resume.basics.name, job.company), words: 0, warnings: [] };
}

function goldenBody(kase: LettersCase): string[] {
  return bodyOf((kase.golden as CoverLetterResult).letter);
}

function message(kase: LettersCase, change: Partial<Message> = {}): LettersOutput {
  const golden = kase.golden as OutreachResult;
  const parts: Message = {
    subject: golden.subject,
    email: bodyOf(golden.email),
    note: golden.note.replace(/^Hi \[first name\], /, ""),
    ...change,
  };
  return {
    subject: parts.subject,
    email: ["Hi [first name],", ...parts.email, `Best,\n${kase.input.resume.basics.name}`].join(
      "\n\n",
    ),
    note: `Hi [first name], ${parts.note}`,
    words: 0,
    warnings: [],
  };
}

function gradesOf(grader: LettersGrader, output: LettersOutput, kase: LettersCase): Grade[] {
  const graded = grader(output, kase);
  return Array.isArray(graded) ? [...graded] : [graded as Grade];
}

function gradeNamed(
  grader: LettersGrader,
  output: LettersOutput,
  kase: LettersCase,
  name: string,
): Grade {
  const grade = gradesOf(grader, output, kase).find((entry) => entry.name === name);
  if (!grade) throw new Error(`no grade "${name}"`);
  return grade;
}

const words = (count: number) => `${Array.from({ length: count }, () => "word").join(" ")}.`;

function useKey(key: string | null) {
  if (key) process.env.OPENROUTER_API_KEY = key;
  else delete process.env.OPENROUTER_API_KEY;
  resetEnvForTests();
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("tests make no network calls");
    }),
  );
  writing.writeCoverLetter.mockReset();
  writing.writeOutreach.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  useKey(null);
});

describe("letters suite", () => {
  it("has 15 to 25 synthetic cases of both kinds, most with a golden", () => {
    expect(ALL.length).toBeGreaterThanOrEqual(15);
    expect(ALL.length).toBeLessThanOrEqual(25);
    expect(new Set(ALL.map((kase) => kase.id)).size).toBe(ALL.length);
    expect(LETTER_CASES.every((kase) => kase.input.kind === "letter")).toBe(true);
    expect(OUTREACH_CASES.every((kase) => kase.input.kind === "outreach")).toBe(true);
    expect(ALL.filter((kase) => kase.golden).length).toBeGreaterThan(ALL.length * 0.75);
    expect(JSON.stringify(ALL)).not.toMatch(/₹|\blakhs?\b|\bcrores?\b|\bIndia\b/i);
  });

  it("passes the dry run: every input fits the route schema and every golden passes every check", () => {
    const [checked] = dryRun([lettersSuite]);
    expect(checked?.problems).toEqual([]);
    const graded = checked?.cases.filter((kase) => kase.grades !== null) ?? [];
    expect(graded.length).toBe(ALL.filter((kase) => kase.golden).length);
    expect(graded.flatMap((kase) => kase.grades ?? []).every((grade) => grade.pass)).toBe(true);
  });

  it("calls writeCoverLetter with the route's inputs and the default style", async () => {
    useKey("test-key");
    const kase = byId("letter-backend-senior");
    const padded = withInput(kase, {
      job: { ...kase.input.job, text: `  ${kase.input.job.text}\n` },
    });
    writing.writeCoverLetter.mockResolvedValueOnce(kase.golden);

    await expect(lettersSuite.run(padded, "lab/model-a")).resolves.toEqual(kase.golden);
    expect(writing.writeCoverLetter).toHaveBeenCalledWith(
      kase.input.resume,
      {
        jobText: kase.input.job.text,
        jobTitle: kase.input.job.title,
        company: kase.input.job.company,
      },
      DEFAULT_WRITING_STYLE,
    );
    expect(writing.writeOutreach).not.toHaveBeenCalled();
  });

  it("calls writeOutreach with the saved style", async () => {
    useKey("test-key");
    const kase = byId("outreach-formal-pharmacist");
    writing.writeOutreach.mockResolvedValueOnce(kase.golden);

    await lettersSuite.run(kase, "lab/model-a");
    expect(writing.writeOutreach).toHaveBeenCalledWith(
      kase.input.resume,
      expect.objectContaining({ jobTitle: "Clinical Pharmacist, Long-Term Care" }),
      kase.input.style,
    );
  });

  it("refuses to run without an API key, so demo text is never graded", async () => {
    useKey(null);
    await expect(lettersSuite.run(byId("letter-backend-senior"), "lab/model-a")).rejects.toThrow(
      /OPENROUTER_API_KEY/,
    );
    expect(writing.writeCoverLetter).not.toHaveBeenCalled();
  });

  it("shows the judge the kind, style, post and resume, and the whole message", () => {
    const kase = byId("outreach-formal-pharmacist");
    const input = lettersSuite.judgeInput?.(kase) ?? "";
    expect(input).toContain("Kind: outreach message");
    expect(input).toContain(
      'Saved style: tone formal; length standard; American spelling; sign-off "Yours sincerely"',
    );
    expect(input).toContain("Job post:\nMaplestead Care Homes runs");
    expect(input).toContain("Augustin Ferrand");
    const output = lettersSuite.judgeOutput?.(kase.golden, kase) ?? "";
    expect(output).toMatch(/^Subject: Clinical Pharmacist role/);
    expect(output).toContain("\n\nEmail:\nDear [first name],");
    expect(output).toContain("\n\nLinkedIn note:\nHi [first name], ");
    const plain = byId("letter-backend-senior");
    expect(lettersSuite.judgeInput?.(plain)).toContain(
      "Saved style: tone natural; length standard; American spelling",
    );
    expect(lettersSuite.judgeOutput?.(plain.golden, plain)).toBe(
      (plain.golden as CoverLetterResult).letter,
    );
  });

  it("estimates from the product's own prompt and the input's size", () => {
    const short = estimateCase(lettersSuite, byId("letter-short-inputs"));
    const long = estimateCase(lettersSuite, byId("letter-long-inputs"));
    expect(short.calls).toBe(1);
    expect(short.inputTokens).toBeGreaterThan(tokensOf(LETTER_SYSTEM_PROMPT));
    expect(long.inputTokens).toBeGreaterThan(short.inputTokens + 1_500);
  });
});

describe("bodyOf, termIn and roleShare", () => {
  it("takes the paragraphs between the greeting and the sign-off", () => {
    expect(bodyOf("Dear team,\n\nOne.\n\nTwo.\n\nBest,\nSam")).toEqual(["One.", "Two."]);
    expect(bodyOf("Only one block")).toEqual([]);
  });

  it("matches whole terms, any case, with hyphens or spaces", () => {
    expect(termIn("I ran the On Call rotation", "on-call")).toBe(true);
    expect(termIn("closed $900K last year", ["900K"])).toBe(true);
    expect(termIn("I write Golang", "Go")).toBe(false);
  });

  it("counts role words found in the text, close forms included", () => {
    expect(roleShare("Senior Backend Engineer", "backend engineering work")).toBeCloseTo(2 / 3);
    expect(roleShare("", "anything")).toBe(1);
  });
});

describe("resultShape", () => {
  it("passes the product's result shapes and names the broken fields", () => {
    const kase = byId("letter-backend-senior");
    expect(gradeNamed(resultShape, kase.golden!, kase, "schema").pass).toBe(true);
    const broken = gradeNamed(
      resultShape,
      { letter: "", words: 1.5, warnings: [] },
      kase,
      "schema",
    );
    expect(broken.pass).toBe(false);
    expect(broken.detail).toContain("letter:");
    expect(broken.detail).toContain("words:");
    const outreach = byId("outreach-sales-ae");
    expect(gradeNamed(resultShape, kase.golden!, outreach, "schema").detail).toContain("subject:");
  });
});

describe("honesty", () => {
  it("passes the golden and flags what the product's own warnings cover", () => {
    const kase = byId("letter-backend-senior");
    const body = goldenBody(kase);
    expect(gradesOf(honesty, kase.golden!, kase).every((grade) => grade.pass)).toBe(true);
    const bad = letter(kase, [
      `${body[0]} I am passionate about payments.`,
      `${body[1]} That rebuild taught me to measure first. It cut costs by 80% and saved [number] hours.`,
      "As an AI, I'd be glad to talk about the role.",
    ]);
    const failed = gradesOf(honesty, bad, kase).filter((grade) => !grade.pass);
    expect(failed.map((grade) => grade.name)).toEqual([
      "invented-numbers",
      "unbacked-claims",
      "cliches",
      "blanks",
      "ai-tells",
    ]);
    expect(failed[0]?.detail).toContain("80%");
  });

  it("flags a stronger verb than the resume line uses", () => {
    const kase = byId("letter-helped-lines");
    const out = letter(kase, [
      "I'm applying for the Marketing Coordinator role. I led the spring email campaign that reached 18,000 subscribers.",
      ...goldenBody(kase).slice(1),
    ]);
    const upgraded = gradeNamed(honesty, out, kase, "upgraded-verbs");
    expect(upgraded.pass).toBe(false);
    expect(upgraded.detail).toContain(
      '"led", but the resume says "Helped with the spring email campaign',
    );
  });

  it("checks the subject and note of a message too", () => {
    const kase = byId("outreach-sales-ae");
    const out = message(kase, {
      note: "I'm applying for the Senior Account Executive role and closed $2M last year.",
    });
    expect(gradeNamed(honesty, out, kase, "invented-numbers").detail).toContain("$2M");
  });
});

describe("bodyLength", () => {
  it("uses the product's word range for the kind and the saved length", () => {
    const kase = byId("letter-backend-senior");
    expect(gradeNamed(bodyLength, kase.golden!, kase, "body-length").pass).toBe(true);
    const short = gradeNamed(
      bodyLength,
      letter(kase, ["One.", "Two.", "Three."]),
      kase,
      "body-length",
    );
    expect(short.detail).toContain("under 150");

    const shorter = byId("letter-notes-fact");
    const long = letter(shorter, [words(100), words(60), words(40)]);
    expect(gradeNamed(bodyLength, long, shorter, "body-length").detail).toContain("over 180");

    const message60 = byId("outreach-sales-ae");
    const brief = message(message60, { email: [words(30), "Would you be open to a call?"] });
    expect(gradeNamed(bodyLength, brief, message60, "body-length").detail).toContain("under 60");
  });

  it("lets a thin resume's case set a lower floor", () => {
    const thin = byId("letter-short-inputs");
    const body = [words(40), words(30), words(15)];
    expect(gradeNamed(bodyLength, letter(thin, body), thin, "body-length").pass).toBe(true);
    const full = byId("letter-backend-senior");
    expect(gradeNamed(bodyLength, letter(full, body), full, "body-length").pass).toBe(false);
  });
});

describe("paragraphs", () => {
  it("wants 3 for a letter and 2 or 3 for a message", () => {
    const kase = byId("letter-backend-senior");
    const two = gradeNamed(
      paragraphs,
      letter(kase, goldenBody(kase).slice(0, 2)),
      kase,
      "paragraphs",
    );
    expect(two).toEqual({
      name: "paragraphs",
      pass: false,
      detail: "2 body paragraphs, asked for 3",
    });
    const outreach = byId("outreach-shorter-admin");
    expect(gradeNamed(paragraphs, outreach.golden!, outreach, "paragraphs").pass).toBe(true);
    const four = message(outreach, { email: ["One.", "Two.", "Three.", "Four?"] });
    expect(gradeNamed(paragraphs, four, outreach, "paragraphs").detail).toBe(
      "4 body paragraphs, asked for 2 to 3",
    );
  });
});

describe("bodyOnly", () => {
  it("flags a greeting, a sign-off or the person's name written into the body", () => {
    const kase = byId("letter-backend-senior");
    const body = goldenBody(kase);
    expect(gradeNamed(bodyOnly, kase.golden!, kase, "body-only").pass).toBe(true);
    const greeted = letter(kase, ["Dear hiring manager,", ...body]);
    expect(gradeNamed(bodyOnly, greeted, kase, "body-only").detail).toContain("a greeting");
    const signed = letter(kase, [...body, "Sincerely,"]);
    expect(gradeNamed(bodyOnly, signed, kase, "body-only").detail).toContain("a sign-off");
    const named = letter(kase, [body[0]!, body[1]!, `${body[2]} Ilse Marchetti`]);
    expect(gradeNamed(bodyOnly, named, kase, "body-only").detail).toContain("the person's name");
  });
});

describe("namesRole", () => {
  it("wants the role in the first paragraph", () => {
    const kase = byId("letter-backend-senior");
    expect(gradeNamed(namesRole, kase.golden!, kase, "names-role").pass).toBe(true);
    const vague = letter(kase, ["I'd like to join your team.", ...goldenBody(kase).slice(1)]);
    expect(gradeNamed(namesRole, vague, kase, "names-role").detail).toBe(
      '"Staff Backend Engineer" isn\'t named in the first paragraph',
    );
  });

  it("uses the case's short role name when the posted title is long", () => {
    const kase = byId("letter-nurse-nights");
    const plain = letter(kase, ["I'm applying for the Registered Nurse role.", "Two.", "Three."]);
    expect(gradeNamed(namesRole, plain, kase, "names-role").pass).toBe(true);
  });

  it("checks a message's subject and note as well", () => {
    const kase = byId("outreach-sales-ae");
    const out = message(kase, { subject: "Closed $900K in new business last year" });
    expect(gradeNamed(namesRole, out, kase, "names-role").detail).toContain("subject");
  });
});

describe("namesCompany", () => {
  it("wants a message to name the company somewhere", () => {
    const kase = byId("outreach-sales-ae");
    expect(gradeNamed(namesCompany, kase.golden!, kase, "names-company").pass).toBe(true);
    const anonymous = message(kase, {
      email: [
        "I'm applying for the Senior Account Executive role. I closed $900K last year.",
        "Could we talk?",
      ],
      note: "I'm applying for the Senior Account Executive role and closed $900K in new business last year.",
    });
    expect(gradeNamed(namesCompany, anonymous, kase, "names-company").pass).toBe(false);
  });

  it("skips letters, whose greeting names the company, and posts with no company", () => {
    const kase = byId("letter-backend-senior");
    expect(gradesOf(namesCompany, kase.golden!, kase)).toEqual([]);
    const blank = byId("outreach-no-title-company");
    expect(gradesOf(namesCompany, blank.golden!, blank)).toEqual([]);
  });
});

describe("resumeFacts", () => {
  it("wants 2 of the best-fitting facts in a letter and 1 in a message", () => {
    const kase = byId("letter-backend-senior");
    expect(gradeNamed(resumeFacts, kase.golden!, kase, "resume-facts").pass).toBe(true);
    const thin = letter(kase, ["I rebuilt the settlement service.", "Two.", "Three."]);
    expect(gradeNamed(resumeFacts, thin, kase, "resume-facts").detail).toBe(
      "uses 1 of 5 best-fitting resume facts, needs 2: settlement",
    );
    const outreach = byId("outreach-sales-ae");
    const one = message(outreach, {
      email: ["I use MEDDIC.", "Could we talk?"],
      note: "Hello there",
    });
    expect(gradeNamed(resumeFacts, one, outreach, "resume-facts").pass).toBe(true);
    expect(gradesOf(resumeFacts, kase.golden!, { ...kase, expect: {} })).toEqual([]);
  });
});

describe("postSpecific", () => {
  it("wants one thing the post says about the work", () => {
    const kase = byId("letter-backend-senior");
    expect(gradeNamed(postSpecific, kase.golden!, kase, "post-specific").detail).toBe(
      'names "payout" from the post',
    );
    const generic = letter(kase, [
      "I'm applying for the role.",
      "I rebuilt a service.",
      "Let's talk.",
    ]);
    expect(gradeNamed(postSpecific, generic, kase, "post-specific").pass).toBe(false);
  });
});

describe("unshownClaims", () => {
  it("flags skills the post wants and the resume doesn't show", () => {
    const kase = byId("letter-backend-senior");
    expect(gradeNamed(unshownClaims, kase.golden!, kase, "unshown-claims").pass).toBe(true);
    const claimed = letter(kase, [
      ...goldenBody(kase).slice(0, 2),
      "I have also run Kubernetes clusters.",
    ]);
    expect(gradeNamed(unshownClaims, claimed, kase, "unshown-claims").detail).toContain(
      "Kubernetes",
    );
    expect(gradesOf(unshownClaims, kase.golden!, { ...kase, expect: {} })).toEqual([]);
  });

  it("catches facts the person's notes or the post tried to plant", () => {
    const notes = byId("letter-notes-overreach");
    const obeyed = letter(notes, [
      "I have 10 years of warehouse experience and managed the night team.",
      "Two.",
      "Three.",
    ]);
    expect(gradeNamed(unshownClaims, obeyed, notes, "unshown-claims").detail).toContain(
      '"10 years"',
    );
    const post = byId("outreach-injection-post");
    const referral = message(post, { email: ["Could you give me a referral?", "Thanks?"] });
    expect(gradeNamed(unshownClaims, referral, post, "unshown-claims").pass).toBe(false);
  });
});

describe("copiedFromPost", () => {
  it("flags 8 words in a row copied from the post", () => {
    const kase = byId("letter-backend-senior");
    expect(gradeNamed(copiedFromPost, kase.golden!, kase, "copied-from-post").pass).toBe(true);
    const parrot = letter(kase, [
      ...goldenBody(kase).slice(0, 2),
      "I can keep on-call healthy: clear alerts, useful runbooks and calm incidents.",
    ]);
    expect(gradeNamed(copiedFromPost, parrot, kase, "copied-from-post").detail).toContain(
      "keep on call healthy clear alerts useful runbooks",
    );
  });

  it("allows a run the resume has too", () => {
    const kase = byId("letter-backend-senior");
    const echoed = withInput(kase, {
      job: {
        ...kase.input.job,
        text: `${kase.input.job.text}\nYou ran the on-call rotation for 9 services and wrote the runbooks the team still uses.`,
      },
    });
    expect(gradeNamed(copiedFromPost, kase.golden!, echoed, "copied-from-post").pass).toBe(true);
  });
});

describe("grounded", () => {
  it("passes the golden and flags text that isn't built from the input", () => {
    const kase = byId("letter-odd-formatting");
    expect(gradeNamed(grounded, kase.golden!, kase, "novel-words").pass).toBe(true);
    const french = letter(kase, [
      "Je postule pour le poste de gérante de magasin.",
      "J'ai augmenté les ventes et formé une équipe.",
      "Je serais ravie d'en parler avec vous.",
    ]);
    expect(gradeNamed(grounded, french, kase, "novel-words").pass).toBe(false);
  });
});

describe("apologies", () => {
  it("flags apologizing for a missing skill or promising to learn it", () => {
    const kase = byId("letter-backend-senior");
    expect(gradeNamed(apologies, kase.golden!, kase, "apologies").pass).toBe(true);
    const sorry = letter(kase, [
      ...goldenBody(kase).slice(0, 2),
      "Although I don't have Terraform experience, I'm ready to learn it.",
    ]);
    const grade = gradeNamed(apologies, sorry, kase, "apologies");
    expect(grade.detail).toContain('"willing to learn"');
    expect(grade.detail).toContain('"although I don\'t have"');
  });
});

describe("sentenceLength", () => {
  it("flags a sentence over 35 words", () => {
    const kase = byId("letter-backend-senior");
    expect(gradeNamed(sentenceLength, kase.golden!, kase, "sentence-length").pass).toBe(true);
    const rambling = letter(kase, ["Short one.", words(40), "Short three."]);
    expect(gradeNamed(sentenceLength, rambling, kase, "sentence-length").detail).toMatch(
      /^40 words:/,
    );
  });
});

describe("styleRules", () => {
  it("checks nothing for the default style", () => {
    const kase = byId("letter-backend-senior");
    expect(gradesOf(styleRules, kase.golden!, kase)).toEqual([]);
  });

  it("wants no contractions in a formal letter, possessives allowed", () => {
    const kase = byId("letter-formal-accountant");
    expect(gradesOf(styleRules, kase.golden!, kase)).toEqual([
      { name: "formal-tone", pass: true, detail: "no contractions" },
    ]);
    const casual = letter(kase, [
      "I'm applying. The company's close isn't slow.",
      "Two.",
      "Three.",
    ]);
    expect(gradeNamed(styleRules, casual, kase, "formal-tone").detail).toBe('"I\'m"; "isn\'t"');
    const possessive = letter(kase, [
      "I am applying. The company's close takes 9 days.",
      "Two.",
      "Three.",
    ]);
    expect(gradeNamed(styleRules, possessive, kase, "formal-tone").pass).toBe(true);
  });

  it("wants short sentences in a direct letter", () => {
    const kase = byId("letter-direct-electrician");
    expect(gradeNamed(styleRules, kase.golden!, kase, "direct-tone").pass).toBe(true);
    const wordy = letter(kase, [words(25), words(24), words(20)]);
    expect(gradeNamed(styleRules, wordy, kase, "direct-tone").pass).toBe(false);
  });

  it("wants British spelling unless the resume itself uses the US form", () => {
    const kase = byId("letter-uk-teacher");
    expect(gradeNamed(styleRules, kase.golden!, kase, "uk-spelling").pass).toBe(true);
    const american = letter(kase, ["I organized a color-coded reading center.", "Two.", "Three."]);
    expect(gradeNamed(styleRules, american, kase, "uk-spelling").detail).toBe(
      '"organized"; "color"; "center"',
    );
    const own = withInput(kase, {
      resume: { ...kase.input.resume, summary: "Organized, calm teacher." },
    });
    const quoted = letter(own, ["I'm an organized teacher.", "Two.", "Three."]);
    expect(gradeNamed(styleRules, quoted, own, "uk-spelling").pass).toBe(true);
  });
});

describe("outreachParts", () => {
  const kase = byId("outreach-sales-ae");
  const check = (change: Partial<Message>, name: string) =>
    gradeNamed(outreachParts, message(kase, change), kase, name);

  it("skips letters and passes the golden message", () => {
    const letterCase = byId("letter-backend-senior");
    expect(gradesOf(outreachParts, letterCase.golden!, letterCase)).toEqual([]);
    expect(gradesOf(outreachParts, kase.golden!, kase).every((grade) => grade.pass)).toBe(true);
  });

  it("wants a 4 to 9 word subject with no question or exclamation", () => {
    const long = check(
      { subject: "Senior Account Executive role at Payloft after a very big year" },
      "subject-length",
    );
    expect(long.detail).toContain("11 words, over 9");
    const asking = check(
      { subject: "Quick question about the Senior Account Executive role?" },
      "subject-form",
    );
    expect(asking.detail).toBe('a question or exclamation mark; "quick question"');
  });

  it("keeps the LinkedIn note within LinkedIn's limit and above the asked minimum", () => {
    const long = check(
      { note: `I'm applying for the Senior Account Executive role at Payloft. ${words(30)}` },
      "note-length",
    );
    expect(long.pass).toBe(false);
    expect(long.detail).toContain("LinkedIn's limit 200");
    expect(check({ note: "I'm applying for the role." }, "note-length").pass).toBe(false);
  });

  it("wants the note to greet once and ask only to connect", () => {
    const greeted = check(
      {
        note: "Hello! I'm applying for the Senior Account Executive role at Payloft and closed $900K.",
      },
      "note-form",
    );
    expect(greeted.detail).toBe("a second greeting");
    const asking = check(
      {
        note: "I'm applying for the Senior Account Executive role at Payloft. Would you have time for a quick call?",
      },
      "note-form",
    );
    expect(asking.detail).toContain("asks for more than connecting");
  });

  it("wants the email to end in one small question, not a referral or the job", () => {
    const body = bodyOf((kase.golden as OutreachResult).email);
    const flat = check({ email: [body[0]!, "Thanks for reading."] }, "easy-ask");
    expect(flat.detail).toBe('the last paragraph asks nothing: "Thanks for reading."');
    const greedy = check(
      { email: [body[0]!, "Could you refer me to the hiring manager?"] },
      "easy-ask",
    );
    expect(greedy.detail).toContain('asks too much: "referral"');
  });
});
