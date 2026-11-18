"use client";

import { Palette } from "lucide-react";
import Link from "next/link";
import { accountSectionHref } from "@/components/setup/links";
import { isDefaultStyle, styleSummary } from "@/lib/writing-style/schema";
import { useWritingStyle } from "./use-writing-style";

// One line in the writing dialogs: which style Otto will use, and a link to change it unless leaving would drop what was typed.
export function WritingStyleHint({ linked = true }: { linked?: boolean }) {
  const { status, style } = useWritingStyle();
  if (status !== "ready") return null;
  const custom = !isDefaultStyle(style);
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted">
      <Palette aria-hidden className="size-4 shrink-0" />
      {custom ? (
        <>
          Written in your style: <span className="font-medium text-ink">{styleSummary(style)}</span>
          .
        </>
      ) : (
        <>Otto writes in a plain, natural style.</>
      )}
      {linked ? (
        <Link
          href={accountSectionHref("writingStyle")}
          className="font-medium text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink"
        >
          {custom ? "Change style" : "Set your style"}
        </Link>
      ) : null}
    </p>
  );
}
