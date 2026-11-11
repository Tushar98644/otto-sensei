import { z } from "zod";
import { TEXT_LIMITS } from "@/config/plans";
import { aiEnabled } from "@/lib/env";
import { resumeToText } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { runStructured } from "./client";
import { TAILOR_SYSTEM_PROMPT } from "./prompts";
import { redactResume, redactorFor } from "./redact";
import { demoTailor } from "./tailor-demo";
import { finalizeTailor, type RawTailor } from "./tailor-finalize";
import { clip, oneLine, tag } from "./text";
import { AIError, type TailorInput, type TailorResult } from "./types";

// resumeToText() adds headings, so an imported resume can render a little past the import cap.
const MAX_RESUME_CHARS = Math.round(TEXT_LIMITS.resumeChars * 1.5);
const JOB_FIELD_CHARS = 200;

const TailorOutputSchema = z.object({
  jobTitle: z.string().describe("As the job post states it. Empty if it doesn't."),
  company: z.string().describe("The hiring company as the post states it. Empty if it doesn't."),
  requirements: z.array(
    z.object({
      text: z.string(),
      importance: z.string().describe('"must" or "nice"'),
      source: z.string().describe('"wording", "structure" or "guess"'),
      terms: z.array(z.string()),
      quote: z.string(),
      ask: z.string(),
    }),
  ),
  bulletOrder: z.array(z.object({ experienceId: z.string(), bulletIds: z.array(z.string()) })),
  summary: z.string(),
  notes: z.array(z.string()),
});

type TailorOutput = z.infer<typeof TailorOutputSchema>;

// Short aliases ("e1", "b4") instead of UUIDs: fewer tokens, and less room to mistype a copied id.
type EntryRef = {
  alias: string;
  id: string;
  label: string;
  bullets: { alias: string; id: string; text: string }[];
  // Blank bullets aren't sent; they keep their place at the end of a returned order.
  blankIds: string[];
};

const EMPTY_RAW: RawTailor = {
  jobTitle: "",
  company: "",
  requirements: [],
  bulletOrder: [],
  summary: "",
  notes: [],
};

function experienceRefs(resume: Resume): EntryRef[] {
  const refs: EntryRef[] = [];
  let bulletCount = 0;
  resume.experience.forEach((job, index) => {
    const written = job.bullets.filter((bullet) => bullet.text.trim());
    if (written.length < 2) return;
    refs.push({
      alias: `e${index + 1}`,
      id: job.id,
      label: [job.title, job.company].filter(Boolean).join(" at ") || "Experience",
      bullets: written.map((bullet) => {
        bulletCount += 1;
        return { alias: `b${bulletCount}`, id: bullet.id, text: bullet.text };
      }),
      blankIds: job.bullets.filter((bullet) => !bullet.text.trim()).map((bullet) => bullet.id),
    });
  });
  return refs;
}

const SNIPPET_WORDS = 6;

function snippet(text: string): string {
  const words = text.trim().split(/\s+/);
  return words.length > SNIPPET_WORDS ? `${words.slice(0, SNIPPET_WORDS).join(" ")}…` : words.join(" ");
}

// People never see aliases ("your b2 bullet"), so each becomes a bullet's opening words or a role.
export function withoutAliases(note: string, refs: readonly EntryRef[]): string {
  const names = new Map<string, string>();
  for (const ref of refs) {
    names.set(ref.alias, `"${ref.label}"`);
    for (const bullet of ref.bullets) names.set(bullet.alias, `line "${snippet(bullet.text)}"`);
  }
  return note.replace(
    /\b(?:(?:bullet|line|entry)\s+)?\b([eb]\d+)\b(?:\s+(?:bullet|line|entry)\b)?/gi,
    (match: string, alias: string) => names.get(alias.toLowerCase()) ?? match,
  );
}

function tailorMessage(resumeText: string, input: TailorInput, refs: EntryRef[]): string {
  const experience = refs.map((ref) => ({
    id: ref.alias,
    role: ref.label,
    bullets: ref.bullets.map((bullet) => ({ id: bullet.alias, text: bullet.text })),
  }));
  const post = [
    input.jobTitle && `Job title: ${input.jobTitle}`,
    input.company && `Company: ${input.company}`,
    input.jobText,
  ].filter(Boolean);
  return [
    tag("resume", resumeText),
    tag("experience", JSON.stringify(experience)),
    tag("job_post", post.join("\n")),
  ].join("\n\n");
}

// An order naming an unknown alias is dropped whole; finalizeTailor checks each is a permutation.
function resolveOrders(
  orders: TailorOutput["bulletOrder"],
  refs: EntryRef[],
): RawTailor["bulletOrder"] {
  const byAlias = new Map(refs.map((ref) => [ref.alias, ref]));
  const resolved: RawTailor["bulletOrder"] = [];
  for (const order of orders) {
    const ref = byAlias.get(order.experienceId.trim());
    if (!ref) continue;
    const ids = new Map(ref.bullets.map((bullet) => [bullet.alias, bullet.id]));
    const bulletIds: string[] = [];
    for (const alias of order.bulletIds) {
      const id = ids.get(alias.trim());
      if (!id) break;
      bulletIds.push(id);
    }
    if (bulletIds.length !== order.bulletIds.length) continue;
    resolved.push({ experienceId: ref.id, bulletIds: [...bulletIds, ...ref.blankIds] });
  }
  return resolved;
}

// Code normalizes requirements (a guess is never a must-have), drops quotes not in the resume word
// for word, recomputes keyword matches and drops invalid orders. No API key: a demo result.
export async function tailorResume(resume: Resume, input: TailorInput): Promise<TailorResult> {
  const job: TailorInput = {
    jobText: input.jobText.trim(),
    jobTitle: clip(oneLine(input.jobTitle), JOB_FIELD_CHARS),
    company: clip(oneLine(input.company), JOB_FIELD_CHARS),
  };
  if (job.jobText.length > TEXT_LIMITS.jobPostChars) {
    throw new AIError("too_long", `The job post is over ${TEXT_LIMITS.jobPostChars} characters`);
  }
  const resumeText = resumeToText(resume);
  if (resumeText.length > MAX_RESUME_CHARS) {
    throw new AIError("too_long", `The resume is over ${MAX_RESUME_CHARS} characters`);
  }
  if (!job.jobText) return finalizeTailor(EMPTY_RAW, resume, job);
  if (!aiEnabled()) return finalizeTailor(demoTailor(resume, job.jobText), resume, job);

  // The redacted copy keeps every id, so its aliases are the real resume's. The post goes as it is.
  const redactor = redactorFor(resume);
  const shown = redactResume(resume, redactor);
  const refs = experienceRefs(resume);
  const output = redactor.restoreDeep(
    await runStructured({
      task: "tailor",
      system: TAILOR_SYSTEM_PROMPT,
      user: tailorMessage(resumeToText(shown), job, experienceRefs(shown)),
      schema: TailorOutputSchema,
      effort: "low",
    }),
  );
  const raw = {
    ...output,
    bulletOrder: resolveOrders(output.bulletOrder, refs),
    notes: output.notes.map((note) => withoutAliases(note, refs)),
  };
  return finalizeTailor(raw, resume, job);
}
