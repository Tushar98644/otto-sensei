// The imports read in the browser, without the parsers behind them, so a page can offer them (and
// open a file picker) without loading JSZip and the LinkedIn reader until a file is picked.

export type LocalImportKind = "linkedin" | "jsonresume";

export const LOCAL_IMPORT_ACCEPT: Record<LocalImportKind, string> = {
  linkedin: ".zip",
  jsonresume: ".json",
};
