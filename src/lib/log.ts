import { DrizzleQueryError } from "drizzle-orm";
import { reportError } from "@/lib/observability/report";

// Never log resume text, job posts, full emails, codes or tokens in `fields`; use maskEmail().

type Level = "info" | "warn" | "error";
type Fields = Record<string, string | number | boolean | null | undefined>;

// Drizzle's query errors list every bound parameter; the wrapped driver error has none.
function loggableError(error: unknown): unknown {
  if (!(error instanceof DrizzleQueryError)) return error;
  return error.cause ?? new Error("Database query failed");
}

function serializeError(error: unknown) {
  const safe = loggableError(error);
  if (safe instanceof Error) return { errorName: safe.name, errorMessage: safe.message };
  return { errorMessage: String(safe) };
}

function write(level: Level, event: string, fields: Fields = {}, error?: unknown) {
  const entry = { level, event, ...fields, ...(error === undefined ? {} : serializeError(error)) };
  const sink = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
  if (process.env.NODE_ENV === "production") {
    sink(JSON.stringify({ ts: new Date().toISOString(), ...entry }));
  } else {
    sink(`[${level}] ${event}`, { ...fields, ...(error === undefined ? {} : serializeError(error)) });
  }
}

export const log = {
  info: (event: string, fields?: Fields) => write("info", event, fields),
  warn: (event: string, fields?: Fields, error?: unknown) => write("warn", event, fields, error),
  error: (event: string, error: unknown, fields?: Fields) => {
    write("error", event, fields, error);
    reportError(event, loggableError(error), fields);
  },
};

export function maskEmail(email: string): string {
  const [name = "", domain = ""] = email.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}
