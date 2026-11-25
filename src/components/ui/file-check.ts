import { fmt } from "@/i18n/format";

export type FileRules = {
  accept?: string;
  maxBytes?: number;
};

// A page's own words for the problems: {kinds} names the accepted types, joined by "{first} or {last}".
export type FileCheckCopy = {
  unsupported: string;
  unsupportedKinds: string;
  kinds: string;
  empty: string;
  tooBig: string;
};

export const FILE_CHECK_ENGLISH: FileCheckCopy = {
  unsupported: "That file type isn't supported.",
  unsupportedKinds: "That file type isn't supported. Choose a {kinds} file.",
  kinds: "{first} or {last}",
  empty: "That file is empty. Choose another one.",
  tooBig: "That file is too big. The limit is {limit}.",
};

export function checkFile(
  file: Pick<File, "name" | "type" | "size">,
  rules: FileRules,
  copy: FileCheckCopy = FILE_CHECK_ENGLISH,
): string | null {
  if (rules.accept && !matchesAccept(file, rules.accept)) {
    const kinds = describeAccept(rules.accept, copy.kinds);
    return kinds ? fmt(copy.unsupportedKinds, { kinds }) : copy.unsupported;
  }
  if (file.size === 0) return copy.empty;
  if (rules.maxBytes !== undefined && file.size > rules.maxBytes) {
    return fmt(copy.tooBig, { limit: formatBytes(rules.maxBytes) });
  }
  return null;
}

export function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function acceptTokens(accept: string): string[] {
  return accept
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
}

// Browsers sometimes report no MIME type (e.g. .docx on some systems), so extensions count too.
function matchesAccept(file: Pick<File, "name" | "type">, accept: string): boolean {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return acceptTokens(accept).some((token) => {
    if (token.startsWith(".")) return name.endsWith(token);
    if (token.endsWith("/*")) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

function describeAccept(accept: string, join: string): string {
  const names = [
    ...new Set(
      acceptTokens(accept)
        .filter((token) => token.startsWith("."))
        .map((token) => token.slice(1).toUpperCase()),
    ),
  ];
  if (names.length <= 1) return names[0] ?? "";
  return fmt(join, { first: names.slice(0, -1).join(", "), last: names.at(-1) ?? "" });
}
