"use client";

import { ChevronDown } from "lucide-react";
import { useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { resumeToText } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";

export async function copyPlainText(resume: Resume): Promise<void> {
  try {
    await navigator.clipboard.writeText(resumeToText(resume));
    toast({ title: "Copied", description: "Paste it into any application form.", variant: "success" });
  } catch {
    toast({
      title: "Couldn't copy",
      description: "Open “See the plain text” under the download button and copy it from there.",
      variant: "error",
    });
  }
}

export function PlainTextDetails({ resume }: { resume: Resume }) {
  const text = useMemo(() => resumeToText(resume), [resume]);
  return (
    <details className="group">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg text-sm font-medium text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        See the plain text
      </summary>
      <Textarea
        readOnly
        value={text}
        rows={12}
        aria-label="Your resume as plain text"
        onFocus={(event) => event.currentTarget.select()}
        className="mt-2 font-mono sm:text-xs"
      />
    </details>
  );
}
