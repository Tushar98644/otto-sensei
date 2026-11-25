"use client";

import { memo, useState } from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useMessages } from "@/i18n/client";
import type { Basics } from "@/lib/resume/schema";
import { CHAR_LIMITS } from "./limits";
import { LinksEditor } from "./links-editor";
import { editResume, useResumeValue } from "./use-editor";

const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type BasicsText = Partial<Omit<Basics, "links">>;

export const BasicsForm = memo(function BasicsForm({ resumeId }: { resumeId: string }) {
  const basics = useResumeValue(resumeId, (resume) => resume.basics, undefined);
  const [checkEmail, setCheckEmail] = useState(false);
  const t = useMessages("studioEditor").basics;
  if (!basics) return null;

  // An email field drops a trailing space, so typing one can change nothing.
  function update(patch: BasicsText) {
    editResume(resumeId, (resume) =>
      Object.entries(patch).every(
        ([key, value]) => resume.basics[key as keyof BasicsText] === value,
      )
        ? resume
        : { ...resume, basics: { ...resume.basics, ...patch } },
    );
  }

  const email = basics.email.trim();
  const emailError =
    checkEmail && email !== "" && !LOOKS_LIKE_EMAIL.test(email)
      ? t.emailIncomplete
      : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.name}>
          <Input
            value={basics.name}
            onChange={(event) => update({ name: event.target.value })}
            maxLength={CHAR_LIMITS.name}
            autoComplete="name"
            placeholder="Alex Morgan"
          />
        </Field>
        <Field label={t.headline} optional>
          <Input
            value={basics.headline}
            onChange={(event) => update({ headline: event.target.value })}
            maxLength={CHAR_LIMITS.headline}
            placeholder={t.headlinePlaceholder}
          />
        </Field>
        <Field label={t.email} error={emailError}>
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            value={basics.email}
            onChange={(event) => update({ email: event.target.value })}
            onBlur={() => setCheckEmail(true)}
            maxLength={CHAR_LIMITS.email}
            placeholder="alex@example.com"
          />
        </Field>
        <Field label={t.phone} optional>
          <Input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={basics.phone}
            onChange={(event) => update({ phone: event.target.value })}
            maxLength={CHAR_LIMITS.phone}
            placeholder="+1 555 0100"
          />
        </Field>
        <Field
          label={t.location}
          optional
          hint={t.locationHint}
          className="sm:col-span-2"
        >
          <Input
            value={basics.location}
            onChange={(event) => update({ location: event.target.value })}
            maxLength={CHAR_LIMITS.location}
            placeholder={t.locationPlaceholder}
          />
        </Field>
      </div>
      <LinksEditor resumeId={resumeId} links={basics.links} />
    </div>
  );
});
