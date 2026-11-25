import type { MessageValue, MessageValues, Placeholders } from "./types";

const PLACEHOLDER = /\{(\w+)\}/g;

// Fills {name} placeholders; one without a value stays as written, so a gap shows instead of a crash.
export function fmt<S extends string>(
  template: S,
  ...[values]: [Placeholders<S>] extends [never] ? [] : [MessageValues<S>]
): string {
  if (!values) return template;
  const given = values as Record<string, MessageValue | undefined>;
  return template.replace(PLACEHOLDER, (whole, name: string) => {
    const value = given[name];
    return value === undefined ? whole : String(value);
  });
}

export function placeholdersOf(template: string): string[] {
  return [...template.matchAll(PLACEHOLDER)].map(([, name = ""]) => name);
}
