import { fmt } from "@/i18n/format";
import type { Messages } from "@/i18n/messages";
import type { Translation } from "@/i18n/types";
import {
  CONFLICT_VERSION_NAMES,
  EDIT_LABELS,
  RENAMED_LABEL,
  restoredLabel,
} from "@/lib/store/history";

type Studio = Translation<Pick<Messages["studio"], "history" | "versions">>;
type LabelKey = keyof Messages["studio"]["history"]["labels"];

// The store writes these labels and version names in English; the studio shows them in its language.
const LABELS = new Map<string, Exclude<LabelKey, "restored">>([
  [EDIT_LABELS.fix, "fix"],
  [EDIT_LABELS.summary, "summary"],
  [EDIT_LABELS.tailor, "tailor"],
  [EDIT_LABELS.format, "format"],
  [RENAMED_LABEL, "renamed"],
]);
const RESTORED = new RegExp(`^${restoredLabel("(.*)")}$`, "su");

export function versionName(name: string, t: Studio["versions"]): string {
  if (name === CONFLICT_VERSION_NAMES.here) return t.conflict.here;
  if (name === CONFLICT_VERSION_NAMES.elsewhere) return t.conflict.elsewhere;
  return name;
}

export function historyLabel(label: string, t: Studio): string {
  const key = LABELS.get(label);
  if (key) return t.history.labels[key];
  const restored = RESTORED.exec(label);
  if (restored) return fmt(t.history.labels.restored, { name: versionName(restored[1] ?? "", t.versions) });
  return label;
}
