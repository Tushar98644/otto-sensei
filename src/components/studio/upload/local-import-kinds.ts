// Kind names only, so a page can offer imports without loading JSZip and the LinkedIn reader.

export type LocalImportKind = "linkedin" | "jsonresume";

export const LOCAL_IMPORT_ACCEPT: Record<LocalImportKind, string> = {
  linkedin: ".zip",
  jsonresume: ".json",
};
