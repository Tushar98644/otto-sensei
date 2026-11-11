// JSON-LD from a client component exists only in the App Router flight stream (self.__next_f).

const PUSH_START = "self.__next_f.push([1,";
const MAX_FLIGHT_CHARS = 3_000_000;
const MAX_OBJECT_CHARS = 300_000;
const OBJECT_START = '{"@';
const STRING_START = '"{\\"@';

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

export function flightJsonLd(payloads: readonly string[], max: number): string[] {
  const flight = payloads.join("").slice(0, MAX_FLIGHT_CHARS);
  const found: string[] = [];
  const keep = (block: string | null) => {
    if (block && block.includes("JobPosting") && found.length < max) found.push(block);
  };

  for (let at = flight.indexOf(OBJECT_START); at !== -1 && found.length < max; ) {
    const end = objectEnd(flight, at);
    if (end !== -1) keep(flight.slice(at, end));
    at = flight.indexOf(OBJECT_START, end === -1 ? at + OBJECT_START.length : end);
  }
  for (let at = flight.indexOf(STRING_START); at !== -1 && found.length < max; ) {
    const end = stringEnd(flight, at);
    if (end !== -1) keep(decodedString(flight.slice(at, end)));
    at = flight.indexOf(STRING_START, end === -1 ? at + STRING_START.length : end);
  }
  return found;
}
