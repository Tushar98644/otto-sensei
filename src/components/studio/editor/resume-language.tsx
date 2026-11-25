"use client";

import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { useMessages } from "@/i18n/client";
import { CONTENT_LANGS, isContentLang, type ContentLang } from "@/lib/i18n/languages";
import { setResumeLang } from "@/lib/resume/lang";
import { editResume, useResumeValue } from "./use-editor";

// Hidden until the app's language setting ships; until then resumeLang() detects the language.
export const SHOW_RESUME_LANGUAGE = false;

// Each language in its own words, as language pickers usually show them.
const NAMES: Record<ContentLang, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
  fr: "Français",
  de: "Deutsch",
};

export function ResumeLanguage({ resumeId }: { resumeId: string }) {
  const lang = useResumeValue(resumeId, (resume) => resume.lang ?? "", "");
  const t = useMessages("studioSections").basics.language;

  function choose(value: string) {
    editResume(resumeId, (resume) => setResumeLang(resume, isContentLang(value) ? value : null), {
      label: t.changed,
    });
  }

  return (
    <Field label={t.label} hint={t.hint}>
      <Select value={lang} onChange={(event) => choose(event.target.value)}>
        <option value="">{t.auto}</option>
        {CONTENT_LANGS.map((code) => (
          <option key={code} value={code}>
            {NAMES[code]}
          </option>
        ))}
      </Select>
    </Field>
  );
}
