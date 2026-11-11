export type HistoryKey = "undo" | "redo";

export type KeyLike = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  isComposing?: boolean;
  defaultPrevented?: boolean;
};

export type FocusLike = {
  tagName: string;
  isContentEditable?: boolean;
  type?: string;
  closest?: (selector: string) => unknown;
};

const NON_TEXT_INPUTS = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

export function isTextField(target: FocusLike | null): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName.toLowerCase();
  if (tag === "textarea" || tag === "select") return true;
  if (tag !== "input") return false;
  return !NON_TEXT_INPUTS.has((target.type ?? "text").toLowerCase());
}

export function historyKey(event: KeyLike, target: FocusLike | null): HistoryKey | null {
  if (event.defaultPrevented || event.isComposing || event.altKey) return null;
  if (!(event.metaKey || event.ctrlKey)) return null;
  if (isTextField(target)) return null;
  if (target?.closest?.("dialog, [role='dialog'], [role='alertdialog']")) return null;
  const key = event.key.toLowerCase();
  if (key === "z") return event.shiftKey ? "redo" : "undo";
  if (key === "y" && event.ctrlKey && !event.metaKey && !event.shiftKey) return "redo";
  return null;
}
