import { BLUEPRINTS, topicsFor, type BlueprintTopic } from "@/lib/ai/interview-blueprints";
import {
  claimsAboutPerson,
  namesIn,
  sentencesOf,
  sourcesOf,
  stem,
  wordsOf,
} from "@/lib/ai/interview-guards";
import { hasInventedNumbers } from "@/lib/ai/guards";
import type { InterviewPrep, TechnicalQuestion } from "@/lib/insights/prep";
import { PREP_LEVELS, type PrepLevel } from "@/lib/insights/prep-focus";
import { listBullets, resumeToText } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import type { Grade } from "../../suite";
import type { InterviewCase } from "./cases";

const MIN_TECHNICAL = 8;
const MAX_TECHNICAL = 12;
const MIN_TOPICS = 4;
const MAX_GENERAL_FOR_TECHNICAL = 6;
const SHARED_WORDS = 2;
const FILLER = new Set(
  "a an the and or of to in on at by for with from how did you your what why it its this that was were is are".split(
    " ",
  ),
);

const grade = (name: string, failures: readonly string[], ok: string): Grade => ({
  name,
  pass: failures.length === 0,
  detail: failures.length === 0 ? ok : failures.slice(0, 3).join("; "),
});

const resumeOf = (kase: InterviewCase) => kase.input.resume as Resume;
const technicalOf = (output: InterviewPrep): readonly TechnicalQuestion[] =>
  output.technical?.questions ?? [];
const textOf = (item: TechnicalQuestion) =>
  [item.topic, item.question, ...item.covers].join(" ").toLowerCase();

export function focusAndLevel(output: InterviewPrep, kase: InterviewCase): Grade {
  const expect = kase.expect;
  const got = output.technical;
  if (!expect) return grade("focus-and-level", [], "no expectation");
  const failures = [
    got?.focus === expect.focus ? "" : `focus ${got?.focus ?? "none"}, expected ${expect.focus}`,
    got?.level === expect.level ? "" : `level ${got?.level ?? "none"}, expected ${expect.level}`,
  ].filter(Boolean);
  return grade("focus-and-level", failures, `${expect.focus}, ${expect.level}`);
}

export function technicalCount(output: InterviewPrep): Grade {
  const count = technicalOf(output).length;
  const ok = count >= MIN_TECHNICAL && count <= MAX_TECHNICAL;
  return grade(
    "technical-count",
    ok ? [] : [`${count} technical questions`],
    `${count} technical questions`,
  );
}

export function questionShape(output: InterviewPrep): Grade {
  const failures = technicalOf(output).flatMap((item, index) => {
    const at = `question ${index + 1}`;
    return [
      item.covers.length >= 3 && item.covers.length <= 6
        ? ""
        : `${at}: ${item.covers.length} covers`,
      item.pitfalls.length >= 1 && item.pitfalls.length <= 3
        ? ""
        : `${at}: ${item.pitfalls.length} pitfalls`,
      item.probes.length === 2 ? "" : `${at}: ${item.probes.length} probes`,
      item.kind === "design" && !/^Assume\b/.test(item.assume)
        ? `${at}: design without an assumed scale`
        : "",
      item.kind !== "design" && item.assume
        ? `${at}: an assumption outside the design question`
        : "",
    ].filter(Boolean);
  });
  return grade("question-shape", failures, "covers, pitfalls, probes and scale where they belong");
}

export function oneDesign(output: InterviewPrep): Grade {
  const count = technicalOf(output).filter((item) => item.kind === "design").length;
  return grade(
    "one-design",
    count === 1 ? [] : [`${count} design questions`],
    "one design question",
  );
}

export function codingWhenSignalled(output: InterviewPrep, kase: InterviewCase): Grade {
  const count = technicalOf(output).filter((item) => item.kind === "coding").length;
  const expected = kase.expect?.coding ?? false;
  const ok = expected ? count >= 1 && count <= 2 : count === 0;
  return grade(
    "coding-when-signalled",
    ok ? [] : [`${count} coding questions, ${expected ? "1 or 2" : "none"} expected`],
    expected ? `${count} warm-ups for a named coding round` : "no warm-ups without a coding round",
  );
}

function topicsHit(item: TechnicalQuestion, topics: readonly BlueprintTopic[]): BlueprintTopic[] {
  const text = textOf(item);
  return topics.filter((topic) => topic.keys.test(text));
}

export function topicCoverage(output: InterviewPrep, kase: InterviewCase): Grade {
  const expect = kase.expect;
  if (!expect) return grade("topic-coverage", [], "no expectation");
  const topics = topicsFor(BLUEPRINTS[expect.focus], expect.level);
  const covered = new Set(
    technicalOf(output)
      .filter((item) => item.kind === "concept" || item.kind === "design")
      .flatMap((item) => topicsHit(item, topics).map((topic) => topic.name)),
  );
  return grade(
    "topic-coverage",
    covered.size >= MIN_TOPICS ? [] : [`${covered.size} of the role's topics covered`],
    `${covered.size} of the role's topics covered`,
  );
}

// Each deep-dive builds on a real resume line and shares its words, so it probes the person's own work.
export function deepDiveGrounding(output: InterviewPrep, kase: InterviewCase): Grade {
  const lines = new Set(
    listBullets(resumeOf(kase)).map((ref) => ref.text.trim().replace(/\.$/, "")),
  );
  const deep = technicalOf(output).filter((item) => item.kind === "deep-dive");
  const failures = deep.flatMap((item, index) => {
    const line = item.resume?.line ?? "";
    if (!lines.has(line)) return [`deep-dive ${index + 1} cites no resume line`];
    const lineWords = new Set(
      wordsOf(line)
        .filter((word) => !FILLER.has(word))
        .map(stem),
    );
    const shared = new Set(wordsOf(item.question).filter((word) => lineWords.has(stem(word)))).size;
    return shared >= SHARED_WORDS
      ? []
      : [`deep-dive ${index + 1} shares ${shared} words with its line`];
  });
  const min = kase.expect?.minDeepDives ?? 0;
  if (deep.length < min) failures.push(`${deep.length} deep-dives, at least ${min} expected`);
  return grade("deep-dive-grounding", failures, `${deep.length} deep-dives on real resume lines`);
}

// The product's own rule, checked again: a sentence about the person names and counts only what the resume or post says.
export function noInventedPersonFacts(output: InterviewPrep, kase: InterviewCase): Grade {
  const sourceTexts = [
    resumeToText(resumeOf(kase)),
    kase.input.job.title ?? "",
    kase.input.job.company ?? "",
    kase.input.job.text,
  ];
  const sources = sourcesOf(sourceTexts);
  const check = (text: string, personal: boolean, where: string): string[] =>
    sentencesOf(text).flatMap((sentence) => {
      if (!personal && !claimsAboutPerson(sentence)) return [];
      const unknown = namesIn(sentence).filter(
        (name) => !sources.known.has(stem(name.toLowerCase())),
      );
      return [
        unknown.length > 0 ? `${where} names ${unknown.join(", ")}: "${sentence}"` : "",
        hasInventedNumbers(sentence, sourceTexts)
          ? `${where} has an unsourced number: "${sentence}"`
          : "",
      ].filter(Boolean);
    });
  const failures = [
    ...technicalOf(output).flatMap((item, index) => [
      ...check(item.question, item.kind === "deep-dive", `technical ${index + 1}`),
      ...[...item.covers, ...item.pitfalls, ...item.probes].flatMap((text) =>
        check(text, false, `technical ${index + 1} notes`),
      ),
    ]),
    ...output.questions.flatMap((item, index) =>
      item.points.flatMap((point) => check(point, false, `question ${index + 1} points`)),
    ),
  ];
  return grade("no-invented-person-facts", failures, "every claim about the person is sourced");
}

const rank = (level: PrepLevel) => PREP_LEVELS.indexOf(level);

// No more than one question pitched above the level; senior and up get at least one beyond the basics.
export function seniorityFit(output: InterviewPrep, kase: InterviewCase): Grade {
  const expect = kase.expect;
  if (!expect) return grade("seniority-fit", [], "no expectation");
  const all = BLUEPRINTS[expect.focus].topics;
  const concepts = technicalOf(output).filter((item) => item.kind === "concept");
  const above = concepts.filter((item) => {
    const hits = topicsHit(item, all);
    return (
      hits.length > 0 && hits.every((topic) => topic.from && rank(topic.from) > rank(expect.level))
    );
  });
  const deeper = concepts.filter((item) =>
    topicsHit(item, all).some((topic) => topic.from && rank(topic.from) >= rank("mid")),
  );
  const failures = [
    above.length > 1 ? `${above.length} questions above the ${expect.level} level` : "",
    rank(expect.level) >= rank("senior") && deeper.length === 0
      ? "no question beyond the basics for this level"
      : "",
  ].filter(Boolean);
  return grade("seniority-fit", failures, `pitched at ${expect.level}`);
}

export function generalRounds(output: InterviewPrep): Grade {
  const rounds = new Set(output.questions.map((item) => item.round));
  const failures = [
    ...(["opening", "fit", "behavioural", "closing"] as const)
      .filter((round) => !rounds.has(round))
      .map((round) => `no ${round} question`),
    output.technical && rounds.has("skills") ? "a skills round beside the technical one" : "",
    output.technical && output.questions.length > MAX_GENERAL_FOR_TECHNICAL
      ? `${output.questions.length} general questions`
      : "",
  ].filter(Boolean);
  return grade("general-rounds", failures, "opening, fit, behavioural and closing, kept short");
}

export function technicalTexts(output: InterviewPrep): string[] {
  return technicalOf(output).flatMap((item) => [
    item.question,
    item.assume,
    ...item.covers,
    ...item.pitfalls,
    ...item.probes,
  ]);
}
