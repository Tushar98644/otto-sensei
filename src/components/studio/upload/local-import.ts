import { formatBytes } from "@/components/ui/file-check";
import { JSON_RESUME_MAX_BYTES, JsonResumeError, parseJsonResume } from "@/lib/jsonresume/import";
import { LINKEDIN_MAX_ZIP_BYTES, LinkedInImportError, readLinkedInExport } from "@/lib/linkedin/import";
import type { Resume } from "@/lib/resume/schema";
import { LOCAL_IMPORT_ACCEPT, type LocalImportKind } from "./local-import-kinds";

export type { LocalImportKind };

export const LOCAL_IMPORTS: Record<LocalImportKind, { accept: string; maxBytes: number }> = {
  linkedin: { accept: LOCAL_IMPORT_ACCEPT.linkedin, maxBytes: LINKEDIN_MAX_ZIP_BYTES },
  jsonresume: { accept: LOCAL_IMPORT_ACCEPT.jsonresume, maxBytes: JSON_RESUME_MAX_BYTES },
};

// The studio words empty and too-big files itself; a parser's own message stays English.
export type LocalImportProblem = { kind: "empty" } | { kind: "tooBig"; size: string } | { kind: "parser" };

export class LocalImportError extends Error {
  constructor(
    message: string,
    readonly problem: LocalImportProblem = { kind: "parser" },
  ) {
    super(message);
  }
}

export async function readLocalImport(kind: LocalImportKind, file: File): Promise<Resume> {
  const { maxBytes } = LOCAL_IMPORTS[kind];
  if (file.size === 0) {
    throw new LocalImportError("That file is empty. Choose another one.", { kind: "empty" });
  }
  if (file.size > maxBytes) {
    const size = formatBytes(maxBytes);
    throw new LocalImportError(`That file is too big. The limit is ${size}.`, {
      kind: "tooBig",
      size,
    });
  }
  try {
    if (kind === "linkedin") return (await readLinkedInExport(await file.arrayBuffer())).resume;
    return parseJsonResume(await file.text());
  } catch (error) {
    if (error instanceof LinkedInImportError || error instanceof JsonResumeError) {
      throw new LocalImportError(error.message);
    }
    throw error;
  }
}
