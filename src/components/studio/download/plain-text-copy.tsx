"use client";

import { ChevronDown, Copy } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { resumeToText } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";

export function PlainTextCopy({ resume }: { resume: Resume }) {
  const text = useMemo(() => resumeToText(resume), [resume]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: "Paste it into any application form.", variant: "success" });
    } catch {
      toast({
        title: "Couldn't copy",
        description: "Open “See the plain text” and copy it from there.",
        variant: "error",
      });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button variant="secondary" onClick={copy} className="w-full">
        <Copy />
        Copy plain text
      </Button>
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
    </div>
  );
}
