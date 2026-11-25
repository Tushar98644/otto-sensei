import type { Locale } from "@/i18n/config";
import { languageOf } from "@/lib/i18n/detect";
import type { ContentLang } from "@/lib/i18n/languages";

// The three language axes (docs/i18n.md): what the resume is in, what the person reads, what the post is in.
export type Languages = { resume: ContentLang; ui: Locale; post?: ContentLang };

export const ENGLISH: Languages = { resume: "en", ui: "en" };

export function isAllEnglish({ resume, ui, post }: Languages): boolean {
  return resume === "en" && ui === "en" && (post === undefined || post === "en");
}

// Opens the user message; left out when everything is English, so those requests stay as they were.
export function languagesTag(languages: Languages): string {
  if (isAllEnglish(languages)) return "";
  const post = languages.post ? ` post="${languages.post}"` : "";
  return `<languages resume="${languages.resume}" ui="${languages.ui}"${post}/>`;
}

// A post too short or mixed to read takes the resume's language.
export function postLanguage(jobText: string, resume: ContentLang): ContentLang {
  return languageOf(jobText, resume);
}

// The languages a guard reads in: the sources' and the output's.
export function guardLangs(...langs: (ContentLang | undefined)[]): ContentLang[] {
  return [...new Set(langs.filter((lang): lang is ContentLang => lang !== undefined))];
}
