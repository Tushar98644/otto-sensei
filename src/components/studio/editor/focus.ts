import { flushSync } from "react-dom";
import { pickNeighbor } from "./edits";

const safe = (id: string) => encodeURIComponent(id);

export const bulletInputId = (bulletId: string) => `fix-line-${safe(bulletId)}`;
export const bulletDeleteId = (bulletId: string) => `fix-line-${safe(bulletId)}-delete`;
export const entryFieldId = (entryId: string, field: string) =>
  `fix-entry-${safe(entryId)}-${field}`;
export const addButtonId = (scope: string) => `fix-add-${safe(scope)}`;
export const addLineButtonId = (parentId: string) => addButtonId(`lines-${parentId}`);
export const sectionDomId = (key: string) => `fix-section-${safe(key)}`;
export const SUMMARY_INPUT_ID = "fix-summary";

export type Caret = "start" | "end" | number;

// Renders synchronously first: the target may not exist yet, or may move and lose focus.
export function editThenFocus(edit: () => void, targetId: string | null, caret?: Caret): void {
  flushSync(edit);
  if (!targetId) return;
  const element = document.getElementById(targetId);
  if (!element) return;
  element.focus();
  // Text inputs of type email or number throw on setSelectionRange, so only lines get a caret.
  if (caret !== undefined && element instanceof HTMLTextAreaElement) {
    const at = caret === "start" ? 0 : caret === "end" ? element.value.length : caret;
    element.setSelectionRange(at, at);
  }
}

export function removeEntryWithFocus(
  entries: readonly { id: string }[],
  entryId: string,
  fallbackId: string,
  remove: () => void,
): void {
  const neighbor = pickNeighbor(
    entries.map((entry) => entry.id),
    entryId,
    "next",
  );
  editThenFocus(remove, neighbor ? entryFieldId(neighbor.id, "remove") : fallbackId);
}
