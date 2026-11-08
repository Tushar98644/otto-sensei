// Client-side checks for a picked or dropped file, worded for the user. The server re-checks
// everything; this only saves a round trip for obvious mistakes.

export type FileRules = {
  // Same syntax as <input accept>, e.g. ".pdf,.docx" or "application/pdf,image/*".
  accept?: string;
  maxBytes?: number;
};

// Returns a message for the user, or null when the file is fine.
export function checkFile(
  file: Pick<File, "name" | "type" | "size">,
  rules: FileRules,
): string | null {
  if (rules.accept && !matchesAccept(file, rules.accept)) {
    const kinds = describeAccept(rules.accept);
    return kinds
      ? `That file type isn't supported. Choose a ${kinds} file.`
      : "That file type isn't supported.";
  }
  if (file.size === 0) return "That file is empty. Choose another one.";
  if (rules.maxBytes !== undefined && file.size > rules.maxBytes) {
    return `That file is too big. The limit is ${formatBytes(rules.maxBytes)}.`;
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

// ".pdf,.docx" → "PDF or DOCX". MIME-only lists have no friendly name, so they give "".
function describeAccept(accept: string): string {
  const names = [
    ...new Set(
      acceptTokens(accept)
        .filter((token) => token.startsWith("."))
        .map((token) => token.slice(1).toUpperCase()),
    ),
  ];
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} or ${names.at(-1)}`;
}
