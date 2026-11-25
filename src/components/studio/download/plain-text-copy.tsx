"use client";

import { ChevronDown } from "lucide-react";
import { useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { useMessages } from "@/i18n/client";
import type { Messages } from "@/i18n/messages";
import { resumeToText } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";

type PlainTextCopy = Messages["studioDownload"]["plainText"];

export async function copyPlainText(resume: Resume, t: PlainTextCopy): Promise<void> {
  try {
    await navigator.clipboard.writeText(resumeToText(resume));
    toast({ title: t.copied, description: t.copiedNote, variant: "success" });
  } catch {
    toast({ title: t.failed, description: t.failedNote, variant: "error" });
  }
}

export function PlainTextDetails({ resume }: { resume: Resume }) {
  const text = useMemo(() => resumeToText(resume), [resume]);
  const t = useMessages("studioDownload").plainText;
  return (
    <details className="group">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg text-sm font-medium text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        {t.see}
      </summary>
      <Textarea
        readOnly
        value={text}
        rows={12}
        aria-label={t.label}
        onFocus={(event) => event.currentTarget.select()}
        className="mt-2 font-mono sm:text-xs"
      />
    </details>
  );
}
