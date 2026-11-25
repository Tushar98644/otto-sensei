import { DEFAULT_LOCALE, intlLocale, type Locale } from "@/i18n/config";
import { fmt } from "@/i18n/format";
import { formatFor, type Format } from "@/i18n/intl";
import { englishMessages, loadMessages } from "@/i18n/messages";
import { uiLocaleOf } from "@/lib/i18n/request";

// Routes answer in English; their error messages go out in the reader's language here, so no route changes how it words them.
// A message is found in the api namespace by its English text, whole or a sentence at a time, and {values} carry over.

type Tree = { readonly [key: string]: string | Tree };
type Entry = { path: string; pattern: RegExp; names: string[]; literal: number };

const PLACEHOLDER = /\{(\w+)\}/g;
// A value never runs past the end of a sentence, so one template can't swallow the next sentence.
const VALUE = "((?:(?![.!?]\\s)[^])+?)";

function leaves(tree: Tree, prefix = ""): [string, string][] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string" ? [[`${prefix}${key}`, value]] : leaves(value, `${prefix}${key}.`),
  );
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function compile(path: string, english: string): Entry | null {
  const names = [...english.matchAll(PLACEHOLDER)].map(([, name = ""]) => name);
  if (names.length === 0) return null;
  const parts = english.split(PLACEHOLDER).filter((_, index) => index % 2 === 0);
  const pattern = new RegExp(`^${parts.map(escape).join(VALUE)}$`);
  return { path, pattern, names, literal: parts.join("").length };
}

const ENGLISH = leaves(englishMessages().api as Tree);
const EXACT = new Map(ENGLISH.map(([path, text]) => [text, path]));
// The most specific template wins: "{plan} keeps {limit} resumes." before "Free keeps {resumes}.".
const TEMPLATES = ENGLISH.flatMap(([path, text]) => compile(path, text) ?? []).sort(
  (a, b) => b.literal - a.literal,
);

const NUMBER = /^\d{1,3}(?:,\d{3})+$|^\d+$/;
const WAIT = /^(\d+) (minute|hour)s?$/;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_DAY = new RegExp(`^(${MONTHS.join("|")}) (\\d{1,2})$`);
const SENTENCE_END = /(?<=[.!?])\s+/;

export type Translate = (english: string) => string;

function translatorFor(locale: Locale, words: ReadonlyMap<string, string>): Translate {
  const format: Format = formatFor(locale);

  function value(text: string): string {
    if (NUMBER.test(text)) return format.number(Number(text.replaceAll(",", "")));
    const wait = WAIT.exec(text);
    if (wait) {
      const unit = wait[2] as "minute" | "hour";
      return new Intl.NumberFormat(intlLocale(locale), {
        style: "unit",
        unit,
        unitDisplay: "long",
      }).format(Number(wait[1]));
    }
    const day = MONTH_DAY.exec(text);
    if (day) {
      const at = Date.UTC(2000, MONTHS.indexOf(day[1] ?? ""), Number(day[2]));
      return format.date(at, { month: "short", day: "numeric", timeZone: "UTC" });
    }
    return one(text) ?? text;
  }

  function one(text: string): string | null {
    const path = EXACT.get(text);
    if (path !== undefined) return words.get(path) ?? null;
    for (const entry of TEMPLATES) {
      const match = entry.pattern.exec(text);
      const template = match ? words.get(entry.path) : undefined;
      if (!match || template === undefined) continue;
      const values = Object.fromEntries(
        entry.names.map((name, index) => [name, value(match[index + 1] ?? "")]),
      );
      return fmt(template, values);
    }
    return null;
  }

  // Whole, else the longest run of sentences that has a translation, then the next run; English if any part has none.
  return (english) => {
    const whole = one(english);
    if (whole !== null) return whole;
    const sentences = english.split(SENTENCE_END);
    const out: string[] = [];
    for (let start = 0; start < sentences.length;) {
      let end = sentences.length;
      let found: string | null = null;
      while (end > start) {
        found = one(sentences.slice(start, end).join(" "));
        if (found !== null) break;
        end -= 1;
      }
      if (found === null) return english;
      out.push(found);
      start = end;
    }
    return out.join(" ");
  };
}

const translators = new Map<Locale, Promise<Translate>>();

export function translatorOf(locale: Locale): Promise<Translate> {
  let translator = translators.get(locale);
  if (!translator) {
    translator = loadMessages(locale, "api").then((messages) =>
      translatorFor(locale, new Map(leaves(messages as Tree))),
    );
    translators.set(locale, translator);
  }
  return translator;
}

type ErrorBody = { ok: false; error: { message: string } };

function isErrorBody(body: unknown): body is ErrorBody {
  if (typeof body !== "object" || body === null || !("error" in body)) return false;
  const { error } = body as { error: unknown };
  return typeof error === "object" && error !== null && "message" in error
    ? typeof (error as { message: unknown }).message === "string"
    : false;
}

// An error answer in the language the app is shown in (the otto_lang cookie when live, else English, which passes through untouched).
export async function localizeError(req: Request, response: Response): Promise<Response> {
  if (response.status < 400) return response;
  const locale = uiLocaleOf(req);
  if (locale === DEFAULT_LOCALE) return response;
  if (!response.headers.get("content-type")?.includes("application/json")) return response;
  let body: unknown;
  try {
    body = await response.clone().json();
  } catch {
    return response;
  }
  if (!isErrorBody(body)) return response;
  const message = (await translatorOf(locale))(body.error.message);
  if (message === body.error.message) return response;
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return Response.json(
    { ...body, error: { ...body.error, message } },
    { status: response.status, statusText: response.statusText, headers },
  );
}

// Wraps a route handler so its error answers follow the reader's language; Next always passes the request, a direct call may not.
export function withApiLocale<A extends unknown[]>(
  handler: (...args: A) => Response | Promise<Response>,
): (...args: A) => Promise<Response> {
  return async (...args) => {
    const response = await handler(...args);
    const [req] = args;
    return req instanceof Request ? localizeError(req, response) : response;
  };
}
