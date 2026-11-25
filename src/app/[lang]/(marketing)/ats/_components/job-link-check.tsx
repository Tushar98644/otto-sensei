"use client";

import { ArrowRight } from "lucide-react";
import Form from "next/form";
import { useId, useState } from "react";
import { OttoNote } from "@/components/mascot/otto-note";
import { TextLink } from "@/components/site/text-link";
import { buttonClasses } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmt } from "@/i18n/format";
import type { HiringSystemId } from "@/lib/ats/types";
import {
  type JobLinkWords,
  type SystemNames,
  jobLinkLine,
  readJobLink,
} from "@/lib/seo-pages/job-link";
import { JOB_MATCH_PARAM } from "@/lib/seo-pages/paths";

export type JobLinkCheckProps = {
  system: HiringSystemId;
  names: SystemNames;
  // The page's words, and where the match check and each guide live in its language.
  t: JobLinkWords;
  action: string;
  guidePaths: Readonly<Record<HiringSystemId, string>>;
  className?: string;
};

export function JobLinkCheck({
  system,
  names,
  t,
  action,
  guidePaths,
  className,
}: JobLinkCheckProps) {
  const id = useId();
  const [link, setLink] = useState("");
  const read = readJobLink(link);
  const other = read.kind === "system" && read.id !== system ? read.id : null;
  return (
    <div className={className}>
      <Form action={action} prefetch={false} className="flex flex-col gap-2">
        <Label htmlFor={id}>{t.label}</Label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            id={id}
            name={JOB_MATCH_PARAM}
            value={link}
            onChange={(event) => setLink(event.target.value)}
            required
            inputMode="url"
            enterKeyHint="go"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={2048}
            placeholder="https://…"
          />
          <button type="submit" className={buttonClasses({ className: "w-full sm:w-auto" })}>
            {t.submit}
            <ArrowRight />
          </button>
        </div>
      </Form>
      <OttoNote size="sm" className="mt-6" message={jobLinkLine(read, system, names, t)}>
        {other ? (
          <TextLink href={guidePaths[other]}>{fmt(t.readGuide, { name: names[other] })}</TextLink>
        ) : null}
      </OttoNote>
    </div>
  );
}
