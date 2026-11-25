// CLDR plural categories; each language uses some of them (English: one, other).
export const PLURAL_CATEGORIES = ["zero", "one", "two", "few", "many", "other"] as const;
export type PluralCategory = (typeof PLURAL_CATEGORIES)[number];

// A message that changes with a count, as { one: "{count} resume", other: "{count} resumes" }.
export type PluralForms = { readonly other: string } & {
  readonly [C in Exclude<PluralCategory, "other">]?: string;
};

type IsPlural<T> = T extends { other: string }
  ? [Exclude<keyof T, PluralCategory>] extends [never]
    ? true
    : false
  : false;

// What a locale file must hold for an English namespace: every key, a string for each string, any plural forms its language needs.
export type Translation<T> = T extends string
  ? string
  : IsPlural<T> extends true
    ? PluralForms
    : { readonly [K in keyof T]: Translation<T[K]> };

// The {name} placeholders a message template uses.
export type Placeholders<S extends string> = string extends S
  ? string
  : S extends `${string}{${infer Name}}${infer Rest}`
    ? Name | Placeholders<Rest>
    : never;

export type MessageValue = string | number;

export type MessageValues<S extends string> = [Placeholders<S>] extends [never]
  ? Record<string, never>
  : Record<Placeholders<S>, MessageValue>;
