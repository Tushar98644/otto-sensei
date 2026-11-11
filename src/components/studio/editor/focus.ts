import { flushSync } from "react-dom";
import { pickNeighbor } from "./edits";

// Stable DOM ids, so focus can follow an item after it's added, moved or removed.

const safe = (id: string) => encodeURIComponent(id);

export const bulletInputId = (bulletId: string) => `fix-line-${safe(bulletId)}`;
export const bulletDeleteId = (bulletId: string) => `fix-line-${safe(bulletId)}-delete`;
export const entryFieldId = (entryId: string, field: string) =>
  `fix-entry-${safe(entryId)}-${field}`;
export const addButtonId = (scope: string) => `fix-add-${safe(scope)}`;
export const addLineButtonId = (parentId: string) => addButtonId(`lines-${parentId}`);
// A section's sheet: a SectionKey, "basics", or an extra section's id.
export const sectionDomId = (key: string) => `fix-section-${safe(key)}`;
// The editor shows one summary at a time, so a fixed id lets other steps open it.
export const SUMMARY_INPUT_ID = "fix-summary";

export type Caret = "start" | "end" | number;

// Renders synchronously before focusing: the target may not exist yet, or may move and lose focus.
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

// Focus goes to the next entry's remove button, so keyboard users keep their spot.
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
