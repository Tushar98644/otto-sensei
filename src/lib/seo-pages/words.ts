// The words of an English content object (written `as const`), in its shape, minus the keys that never change.
export type Words<T, Fixed extends PropertyKey = never> = T extends string
  ? string
  : T extends readonly unknown[]
    ? { readonly [I in keyof T]: Words<T[I], Fixed> }
    : T extends object
      ? {
          readonly [
            K in keyof T as K extends Fixed
              ? never
              : NonNullable<T[K]> extends string | object
                ? K
                : never
          ]: Words<T[K], Fixed>;
        }
      : never;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// The English object with each translated string put in its place; keys a translation leaves out keep their English value.
export function withWords<T>(english: T, words: unknown): T {
  if (typeof english === "string") return (typeof words === "string" ? words : english) as T;
  if (Array.isArray(english)) {
    const list = Array.isArray(words) ? words : [];
    return english.map((item, index) => withWords(item, list[index])) as T;
  }
  if (isRecord(english)) {
    const given = isRecord(words) ? words : {};
    return Object.fromEntries(
      Object.entries(english).map(([key, value]) => [
        key,
        key in given ? withWords(value, given[key]) : value,
      ]),
    ) as T;
  }
  return english;
}
