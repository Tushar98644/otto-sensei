import { UPLOAD_ACCEPT } from "@/components/studio/upload/upload-handoff";
import { checkFile, formatBytes } from "@/components/ui/file-check";
import { UPLOAD_LIMITS } from "@/config/plans";
import { fmt } from "@/i18n/format";
import type { DashboardMessages } from "./i18n";

export function dropHint(t: DashboardMessages): string {
  return fmt(t.drop.hint, { size: formatBytes(UPLOAD_LIMITS.maxBytes) });
}

type FileLike = Pick<File, "name" | "type" | "size">;

type DroppedResume<F extends FileLike> =
  { file: F; problem: null } | { file: null; problem: string };

export function droppedResume<F extends FileLike>(
  files: readonly F[],
  t: DashboardMessages,
): DroppedResume<F> {
  const [file, ...rest] = files;
  if (!file) return { file: null, problem: t.drop.notFile };
  if (rest.length > 0) return { file: null, problem: t.drop.oneFile };
  const problem = checkFile(file, { accept: UPLOAD_ACCEPT, maxBytes: UPLOAD_LIMITS.maxBytes });
  return problem ? { file: null, problem } : { file, problem: null };
}

export function carriesFiles(transfer: Pick<DataTransfer, "types"> | null): boolean {
  return transfer !== null && Array.from(transfer.types).includes("Files");
}
