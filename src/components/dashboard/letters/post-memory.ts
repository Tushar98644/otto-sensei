import { TEXT_LIMITS } from "@/config/plans";
import { normalizeJobUrl } from "@/lib/applications/schema";
import { MIN_TARGET_POST_CHARS, type WriteTarget } from "./write-targets";

const STORE = "otto:letters:posts";
const KEEP = 12;

type Kept = Record<string, { text: string; at: number }>;

let memory: Kept | null = null;

function load(): Kept {
  if (memory) return memory;
  memory = {};
  try {
    const raw = window.localStorage.getItem(STORE);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object") {
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        const item = value as { text?: unknown; at?: unknown };
        if (typeof item?.text === "string" && typeof item.at === "number")
          memory[key] = { text: item.text, at: item.at };
      }
    }
  } catch {
    // Storage can be blocked; the posts then last as long as the tab.
  }
  return memory;
}

export function postKey(
  target: Pick<WriteTarget, "applicationId" | "jobId" | "url" | "value">,
): string {
  if (target.applicationId) return `application:${target.applicationId}`;
  if (target.jobId) return `job:${target.jobId}`;
  const link = target.url ? normalizeJobUrl(target.url) : null;
  return link ? `url:${link}` : target.value;
}

// A post pasted once, so a message, an answer or another letter for the same job never asks for it again.
export function rememberedPost(
  target: Pick<WriteTarget, "applicationId" | "jobId" | "url" | "value">,
): string {
  if (typeof window === "undefined") return "";
  return load()[postKey(target)]?.text ?? "";
}

export function rememberPost(
  target: Pick<WriteTarget, "applicationId" | "jobId" | "url" | "value">,
  text: string,
): void {
  const value = text.trim();
  if (
    typeof window === "undefined" ||
    value.length < MIN_TARGET_POST_CHARS ||
    value.length > TEXT_LIMITS.jobPostChars
  ) {
    return;
  }
  const kept = load();
  kept[postKey(target)] = { text: value, at: Date.now() };
  const newest = Object.entries(kept)
    .sort(([, a], [, b]) => b.at - a.at)
    .slice(0, KEEP);
  memory = Object.fromEntries(newest);
  try {
    window.localStorage.setItem(STORE, JSON.stringify(memory));
  } catch {
    // Full or blocked storage keeps the post for this tab only.
  }
}

// The post is known once it was pasted here before, so the target writes in one click.
export function withRememberedPost(target: WriteTarget): WriteTarget {
  if (target.post.kind === "saved") return target;
  const text = rememberedPost(target);
  return text ? { ...target, post: { kind: "saved", text } } : target;
}
