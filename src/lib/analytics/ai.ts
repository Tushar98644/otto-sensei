import type { Feature } from "@/config/plans";
import { modelFor, type AITask } from "@/lib/ai/client";
import { AIError } from "@/lib/ai/types";
import { aiEnabled } from "@/lib/env";
import { log } from "@/lib/log";
import { posthogKey } from "./config";
import type { AICallOutcome, ServerEvent } from "./events";
import { ANONYMOUS_ID, captureServerEvent } from "./server";

// Server-only. ai_call (task, model, latency, outcome) for every AI request, plus the funnel step
// a metered endpoint stands for. Nothing about the input or the answer is sent.

// The endpoints that are funnel steps. /api/summary, /api/answer and /api/interview are AI calls too
// (ai_call), just not steps of their own.
const FUNNEL_STEPS: Readonly<Record<string, Extract<ServerEvent, "line_fixed" | "tailor_run" | "letter_written">>> = {
  fix: "line_fixed",
  tailor: "tailor_run",
  letter: "letter_written",
};

export type AICall = {
  // null before sign-in: the call is counted without a person behind it.
  userId: string | null;
  // What the person asked for ("fix", "summary", "structure"), more precise than the AITask.
  task: string;
  // The task the model was picked for, which decides the model.
  aiTask: AITask;
  startedAt: number;
};

// The model settings each allowance runs on (see MAX_TOKENS in src/lib/ai/client.ts). Imports run
// as "structure"; drafts and GitHub lines run on the fix settings, like they always have.
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
  // The request's pathname: "/api/fix". Names the job more precisely than the allowance it uses
  // (/api/summary draws on "fix").
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

// These run inside request handlers, so a bug here must cost an event, never the response. Without
// a key there's nowhere to send, so nothing is worked out either.
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

/**
 * One AI request finished: pass the error when it failed. Skipped in demo mode, where no model
 * runs. For AI steps outside runMetered that fall back to rules (drafts, GitHub projects).
 */
export function trackAICall(call: AICall, error?: unknown): void {
  safely(() => {
    if (aiEnabled()) sendAICall(call, error === undefined ? "ok" : outcomeOf(error));
  });
}

/** After a metered route's AI step: ai_call when a model ran, and the funnel step on success. */
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

/** After an upload was structured. `usedAI` false with a key set means the model failed and rules took over. */
export function trackStructureCall(startedAt: number, usedAI: boolean): void {
  safely(() => {
    if (!aiEnabled()) return;
    const call: AICall = { userId: null, task: "structure", aiTask: "structure", startedAt };
    sendAICall(call, usedAI ? "ok" : "fallback");
  });
}
