"use client";

import { ArrowRight } from "lucide-react";
import Form from "next/form";
import { useId, useState } from "react";
import { OttoNote } from "@/components/mascot/otto-note";
import { TextLink } from "@/components/site/text-link";
import { buttonClasses } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HiringSystemId } from "@/lib/ats/types";
import { type SystemNames, jobLinkLine, readJobLink } from "@/lib/seo-pages/job-link";
import { JOB_MATCH_PARAM, SEO_PATHS, atsPath } from "@/lib/seo-pages/paths";

export type JobLinkCheckProps = {
  system: HiringSystemId;
  names: SystemNames;
  className?: string;
};

export function JobLinkCheck({ system, names, className }: JobLinkCheckProps) {
  const id = useId();
  const [link, setLink] = useState("");
  const read = readJobLink(link);
  const other = read.kind === "system" && read.id !== system ? read.id : null;
  return (
    <div className={className}>
      <Form action={SEO_PATHS.jobMatch} prefetch={false} className="flex flex-col gap-2">
        <Label htmlFor={id}>Job link</Label>
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
            Check my resume against this job
            <ArrowRight />
          </button>
        </div>
      </Form>
      <OttoNote size="sm" className="mt-6" message={jobLinkLine(read, system, names)}>
        {other ? <TextLink href={atsPath(other)}>Read the {names[other]} guide</TextLink> : null}
      </OttoNote>
    </div>
  );
}
