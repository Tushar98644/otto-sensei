import en from "../_locales/en/messages.json";

// The extension's words live in extension/_locales and come through chrome.i18n, in the browser's language when Otto speaks it.

export type MessageKey = keyof typeof en;

type Entry = { message: string; placeholders?: Record<string, { content: string }> };
type I18n = { getMessage(key: string, substitutions?: string[]): string };

function chromeI18n(): I18n | undefined {
  return (globalThis as { chrome?: { i18n?: I18n } }).chrome?.i18n;
}

// Chrome's own reading of messages.json ($NAME$ to its $n, then $n to a value), where chrome.i18n isn't there, as in tests.
function english(key: MessageKey, values: readonly string[]): string {
  const entry: Entry = en[key];
  return entry.message
    .replace(
      /\$([A-Za-z0-9_@]+)\$/g,
      (whole, name: string) => entry.placeholders?.[name.toLowerCase()]?.content ?? whole,
    )
    .replace(/\$(\d|\$)/g, (_, which: string) =>
      which === "$" ? "$" : (values[Number(which) - 1] ?? ""),
    );
}

export function t(key: MessageKey, ...values: (string | number)[]): string {
  const strings = values.map(String);
  return chromeI18n()?.getMessage(key, strings) || english(key, strings);
}

// The language the words above are in: the browser's if Otto speaks it, else English.
export function wordsLang(): string {
  return t("lang");
}

const rules = new Map<string, Intl.PluralRules>();

// Chrome has no plural forms, so each counted message has a One and an Other key.
export function pluralKey<K extends MessageKey>(count: number, one: K, other: K): K {
  const lang = wordsLang();
  let rule = rules.get(lang);
  if (!rule) {
    rule = new Intl.PluralRules(lang);
    rules.set(lang, rule);
  }
  return rule.select(count) === "one" ? one : other;
}
