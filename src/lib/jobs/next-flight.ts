// Server-only. Next.js App Router pages stream their server output through inline scripts,
// self.__next_f.push([1,"..."]). JSON-LD rendered by a client component (next/script) exists only
// in that stream, not as a tag in the HTML, so job pages like jobs.micro1.ai need it read from
// there. Same rule as html.ts: indexOf and linear scans only, never a backtracking regex.

const PUSH_START = "self.__next_f.push([1,";
const MAX_FLIGHT_CHARS = 3_000_000;
const MAX_OBJECT_CHARS = 300_000;
// A schema.org object starts with "@context" or "@type" in every site seen so far.
const OBJECT_START = '{"@';
// The same object as a string prop (dangerouslySetInnerHTML.__html, or short children).
const STRING_START = '"{\\"@';

/** The stream text of one inline script, or null when the script is anything else. */
export function flightPayload(script: string): string | null {
  const code = script.trim().replace(/;$/, "");
  if (!code.startsWith(PUSH_START) || !code.endsWith("])")) return null;
  try {
    const value: unknown = JSON.parse(code.slice(PUSH_START.length, -2));
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

// Index just past the JSON object that opens at `from`, or -1 if it doesn't close in time.
function objectEnd(text: string, from: number): number {
  const limit = Math.min(text.length, from + MAX_OBJECT_CHARS);
  let depth = 0;
  let inString = false;
  for (let i = from; i < limit; i++) {
    const char = text[i];
    if (inString) {
      if (char === "\\") i++;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === "{") depth++;
    else if (char === "}" && --depth === 0) return i + 1;
  }
  return -1;
}

// Index just past the JSON string literal that opens at `from`, or -1.
function stringEnd(text: string, from: number): number {
  const limit = Math.min(text.length, from + MAX_OBJECT_CHARS);
  for (let i = from + 1; i < limit; i++) {
    if (text[i] === "\\") i++;
    else if (text[i] === '"') return i + 1;
  }
  return -1;
}

function decodedString(literal: string): string | null {
  try {
    const value: unknown = JSON.parse(literal);
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

/** JobPosting JSON-LD found in the stream, as raw JSON text for findJsonLdJob. */
export function flightJsonLd(payloads: readonly string[], max: number): string[] {
  const flight = payloads.join("").slice(0, MAX_FLIGHT_CHARS);
  const found: string[] = [];
  const keep = (block: string | null) => {
    if (block && block.includes("JobPosting") && found.length < max) found.push(block);
  };

  for (let at = flight.indexOf(OBJECT_START); at !== -1 && found.length < max; ) {
    const end = objectEnd(flight, at);
    if (end !== -1) keep(flight.slice(at, end));
    // Past the whole object, so its nested {"@type": ...} parts aren't read again.
    at = flight.indexOf(OBJECT_START, end === -1 ? at + OBJECT_START.length : end);
  }
  for (let at = flight.indexOf(STRING_START); at !== -1 && found.length < max; ) {
    const end = stringEnd(flight, at);
    if (end !== -1) keep(decodedString(flight.slice(at, end)));
    at = flight.indexOf(STRING_START, end === -1 ? at + STRING_START.length : end);
  }
  return found;
}
