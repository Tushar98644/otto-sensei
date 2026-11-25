"use client";

import { Palette } from "lucide-react";
import Link from "next/link";
import { accountSectionHref } from "@/components/setup/links";
import { useMessagesOr } from "@/i18n/client";
import EN_LETTERS from "@/i18n/messages/en/letters";
import { rich } from "@/i18n/rich";
import { isDefaultStyle, styleSummary } from "@/lib/writing-style/schema";
import { useWritingStyle } from "./use-writing-style";

// One line in the writing dialogs: which style Otto will use, and a link to change it unless leaving would drop what was typed.
export function WritingStyleHint({ linked = true }: { linked?: boolean }) {
  const { status, style } = useWritingStyle();
  const t = useMessagesOr("letters", EN_LETTERS).reader;
  if (status !== "ready") return null;
  const custom = !isDefaultStyle(style);
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted">
      <Palette aria-hidden className="size-4 shrink-0" />
      {custom ? (
        <span>
          {rich(
            t.styleCustom,
            { b: (chunk) => <span className="font-medium text-ink">{chunk}</span> },
            { style: styleSummary(style, t.styleParts) },
          )}
        </span>
      ) : (
        <span>{t.stylePlain}</span>
      )}
      {linked ? (
        <Link
          href={accountSectionHref("writingStyle")}
          className="font-medium text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink"
        >
          {custom ? t.changeStyle : t.setStyle}
        </Link>
      ) : null}
    </p>
  );
}
