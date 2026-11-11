import type { Feature } from "@/config/plans";
import { modelFor, type AITask } from "@/lib/ai/client";
import { AIError } from "@/lib/ai/types";
import { aiEnabled } from "@/lib/env";
import { log } from "@/lib/log";
import { posthogKey } from "./config";
import type { AICallOutcome, ServerEvent } from "./events";
import { ANONYMOUS_ID, captureServerEvent } from "./server";

// Nothing about the input or the answer is sent.

// /api/summary, /api/answer and /api/interview are AI calls (ai_call) but not funnel steps.
const FUNNEL_STEPS: Readonly<Record<string, Extract<ServerEvent, "line_fixed" | "tailor_run" | "letter_written">>> = {
  fix: "line_fixed",
  tailor: "tailor_run",
  letter: "letter_written",
};

export type AICall = {
  // null before sign-in: counted without a person behind it.
  userId: string | null;
  // What the person asked for, more precise than the AITask.
  task: string;
  aiTask: AITask;
  startedAt: number;
};

// Imports run as "structure"; drafts and GitHub lines run on the fix settings.
const AI_TASK_OF: Record<Feature, AITask> = {
  fix: "fix",
  tailor: "tailor",
  letter: "letter",
  import: "structure",
  draft: "fix",
  github: "fix",
};

export type MeteredCall = {
  userId: string;
  // Names the job more precisely than its allowance (/api/summary draws on "fix").
  path: string;
  feature: Feature;
  startedAt: number;
};

export function outcomeOf(error: unknown): AICallOutcome {
  return error instanceof AIError ? error.code : "error";
}

function endpointOf(path: string): string {
  return path.split("/").filter(Boolean).at(-1) ?? "unknown";
}

// A bug here must cost an event, never the response.
function safely(run: () => void): void {
  if (!posthogKey()) return;
  try {
    run();
  } catch (error) {
    log.warn("analytics.track_failed", {}, error);
  }
}

function sendAICall(call: AICall, outcome: AICallOutcome): void {
  captureServerEvent(call.userId ?? ANONYMOUS_ID, "ai_call", {
    task: call.task,
    model: modelFor(call.aiTask),
    latency_ms: Date.now() - call.startedAt,
    outcome,
  });
}

// Skipped in demo mode. For AI steps outside runMetered that fall back to rules.
export function trackAICall(call: AICall, error?: unknown): void {
  safely(() => {
    if (aiEnabled()) sendAICall(call, error === undefined ? "ok" : outcomeOf(error));
  });
}

/** ai_call when a model ran, and the funnel step on success. */
export function trackMeteredCall(call: MeteredCall, error?: unknown): void {
  safely(() => {
    const task = endpointOf(call.path);
    const demo = !aiEnabled();
    if (!demo) {
      const outcome = error === undefined ? "ok" : outcomeOf(error);
      sendAICall({ userId: call.userId, task, aiTask: AI_TASK_OF[call.feature], startedAt: call.startedAt }, outcome);
    }
    const step = FUNNEL_STEPS[task];
    if (error === undefined && step) captureServerEvent(call.userId, step, { demo });
  });
}

/** `usedAI` false with a key set means the model failed and rules took over. */
export function trackStructureCall(startedAt: number, usedAI: boolean): void {
  safely(() => {
    if (!aiEnabled()) return;
    const call: AICall = { userId: null, task: "structure", aiTask: "structure", startedAt };
    sendAICall(call, usedAI ? "ok" : "fallback");
  });
}
