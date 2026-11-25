import { intlLocale, type Locale } from "./config";
import { fmt, selectPlural } from "./format";
import type { MessageValue, PluralForms } from "./types";

export type Format = {
  locale: Locale;
  number(value: number, options?: Intl.NumberFormatOptions): string;
  currency(value: number, currency?: string, options?: Intl.NumberFormatOptions): string;
  date(value: Date | number, options?: Intl.DateTimeFormatOptions): string;
  list(values: readonly string[], options?: Intl.ListFormatOptions): string;
  relativeTime(
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    options?: Intl.RelativeTimeFormatOptions,
  ): string;
  // The form for count, with {count} written as a number in this language.
  plural(forms: PluralForms, count: number, values?: Record<string, MessageValue>): string;
};

// Building an Intl formatter is slow and these run per row, so each locale and option set is built once.
const built = new Map<string, unknown>();

function once<T>(kind: string, tag: string, options: object | undefined, make: () => T): T {
  const key = `${kind}|${tag}|${options ? JSON.stringify(options) : ""}`;
  let value = built.get(key) as T | undefined;
  if (value === undefined) {
    value = make();
    built.set(key, value);
  }
  return value;
}

const formats = new Map<Locale, Format>();

export function formatFor(locale: Locale): Format {
  const existing = formats.get(locale);
  if (existing) return existing;
  const tag = intlLocale(locale);
  const numbers = (options?: Intl.NumberFormatOptions) =>
    once("number", tag, options, () => new Intl.NumberFormat(tag, options));
  const format: Format = {
    locale,
    number: (value, options) => numbers(options).format(value),
    currency: (value, currency = "USD", options) =>
      numbers({ style: "currency", currency, ...options }).format(value),
    date: (value, options) =>
      once("date", tag, options, () => new Intl.DateTimeFormat(tag, options)).format(value),
    list: (values, options) =>
      once("list", tag, options, () => new Intl.ListFormat(tag, options)).format(values),
    relativeTime: (value, unit, options) =>
      once("relative", tag, options, () => new Intl.RelativeTimeFormat(tag, options)).format(
        value,
        unit,
      ),
    plural: (forms, count, values) =>
      fmt(selectPlural(locale, forms, count), { ...values, count: numbers().format(count) }),
  };
  formats.set(locale, format);
  return format;
}
