import { UPLOAD_ACCEPT } from "@/components/studio/upload/upload-handoff";
import { checkFile, formatBytes } from "@/components/ui/file-check";
import { UPLOAD_LIMITS } from "@/config/plans";

export const DROP_HINT = `PDF or Word, up to ${formatBytes(UPLOAD_LIMITS.maxBytes)}. Otto opens it in the studio.`;

type FileLike = Pick<File, "name" | "type" | "size">;

type DroppedResume<F extends FileLike> = { file: F; problem: null } | { file: null; problem: string };

export function droppedResume<F extends FileLike>(files: readonly F[]): DroppedResume<F> {
  const [file, ...rest] = files;
  if (!file) return { file: null, problem: "That wasn't a file. Drop a PDF or Word file." };
  if (rest.length > 0) return { file: null, problem: "Drop one file at a time." };
  const problem = checkFile(file, { accept: UPLOAD_ACCEPT, maxBytes: UPLOAD_LIMITS.maxBytes });
  return problem ? { file: null, problem } : { file, problem: null };
}

export function carriesFiles(transfer: Pick<DataTransfer, "types"> | null): boolean {
  return transfer !== null && Array.from(transfer.types).includes("Files");
}
