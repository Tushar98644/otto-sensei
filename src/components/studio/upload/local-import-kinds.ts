export type LocalImportKind = "linkedin" | "jsonresume";

export const LOCAL_IMPORT_ACCEPT: Record<LocalImportKind, string> = {
  linkedin: ".zip",
  jsonresume: ".json",
};
