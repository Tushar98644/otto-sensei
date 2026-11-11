import { flushSync } from "react-dom";
import { pickNeighbor } from "./edits";

// Stable DOM ids, so focus can follow an item after it's added, moved or removed. Item ids are
// only unique inside one resume, and the editor shows one resume at a time. The prefix keeps them
// clear of ids used elsewhere on the page.

const safe = (id: string) => encodeURIComponent(id);

export const bulletInputId = (bulletId: string) => `fix-line-${safe(bulletId)}`;
export const bulletDeleteId = (bulletId: string) => `fix-line-${safe(bulletId)}-delete`;
export const entryFieldId = (entryId: string, field: string) =>
  `fix-entry-${safe(entryId)}-${field}`;
export const addButtonId = (scope: string) => `fix-add-${safe(scope)}`;
export const addLineButtonId = (parentId: string) => addButtonId(`lines-${parentId}`);
// The editor shows one summary at a time, so a fixed id lets other steps open it.
export const SUMMARY_INPUT_ID = "fix-summary";

export type Caret = "start" | "end" | number;

// Renders a store edit right away, then moves focus. Without the synchronous render the element to
// focus may not exist yet, or may be about to move, and a DOM node that moves loses focus.
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

// Focus lands on the remove button of the entry that took the removed one's place, so keyboard
// users keep their spot instead of being sent back to the top of the page.
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
