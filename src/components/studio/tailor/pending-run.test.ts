import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RESULT_TTL_MS } from "@/lib/api/request-id";
import { emptyResume } from "@/lib/resume/schema";
import { closeRun, finishRun, interruptedRun, sendRun } from "./pending-run";

const NOW = 1_000_000;
const source = { ...emptyResume(5_000), id: "resume-1" };
const job = { title: "Designer", company: "Canva", text: "The post as it was sent." };
const KEY = "otto-tailor-pending-v1:resume-1";

let data: Map<string, string>;

beforeEach(() => {
  data = new Map();
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("a pending tailor run", () => {
  it("keeps one id per run, trimmed fields and resume version included", () => {
    const { id } = sendRun(source, job, NOW);
    expect(sendRun(source, { ...job, text: ` ${job.text} ` }, NOW + 5)).toEqual({ id });
    expect(interruptedRun(source, NOW + 5)).toEqual({ job: { ...job, text: ` ${job.text} ` }, run: { id, resume: true } });

    expect(sendRun(source, { ...job, company: "Figma" }, NOW).id).not.toBe(id);
    expect(sendRun({ ...source, updatedAt: 6_000 }, job, NOW).id).not.toBe(id);
  });

  it("is picked up only while open, for the same resume version and inside the time the answer is kept", () => {
    const { id } = sendRun(source, job, NOW);
    expect(interruptedRun({ ...source, updatedAt: 6_000 }, NOW)).toBeNull();
    expect(interruptedRun(source, NOW + RESULT_TTL_MS + 1)).toBeNull();
    expect(interruptedRun(source, NOW + RESULT_TTL_MS)?.run).toEqual({ id, resume: true });

    closeRun(source.id);
    expect(interruptedRun(source, NOW)).toBeNull();
    expect(sendRun(source, job, NOW + 10)).toEqual({ id });
    expect(interruptedRun(source, NOW + RESULT_TTL_MS)).not.toBeNull();
    expect(sendRun(source, job, NOW + RESULT_TTL_MS)).toEqual({ id });
    expect(interruptedRun(source, NOW + RESULT_TTL_MS + 10)).not.toBeNull();

    finishRun(source.id);
    expect(interruptedRun(source, NOW)).toBeNull();
    expect(sendRun(source, job, NOW).id).not.toBe(id);
  });

  it("ignores anything unreadable in storage", () => {
    data.set(KEY, "not json");
    expect(interruptedRun(source, NOW)).toBeNull();
    data.set(KEY, JSON.stringify({ run: "x", id: "y", at: NOW, open: true, job: { text: 1 } }));
    expect(interruptedRun(source, NOW)).toBeNull();
    closeRun(source.id);
    expect(sendRun(source, job, NOW).id).not.toBe("y");
  });
});
