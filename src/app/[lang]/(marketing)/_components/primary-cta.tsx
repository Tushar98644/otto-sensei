"use client";

import { ArrowRight } from "lucide-react";
import { IntentLink } from "@/components/site/intent-link";
import { ROUTES } from "@/components/site/routes";
import { buttonClasses } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { fmt } from "@/i18n/format";
import { cn } from "@/lib/utils";
import { pickResumeFile, preloadOpener, useHomeUpload } from "./home-picker";

export type PrimaryCtaCopy = { check: string; continueWith: string };

export type PrimaryCtaProps = {
  copy: PrimaryCtaCopy;
  id?: string;
  className?: string;
  // A resume this browser already holds: the button goes back to it instead of asking for a file.
  savedTitle?: string | null;
};

// A link to the studio until the home page hydrates, then the file picker; a modified click still opens the studio.
export function PrimaryCta({ copy, id, className, savedTitle }: PrimaryCtaProps) {
  const { opening } = useHomeUpload();
  const picks = !savedTitle;
  return (
    <IntentLink
      id={id}
      href={ROUTES.studio}
      aria-busy={opening ? true : undefined}
      onMouseEnter={picks ? preloadOpener : undefined}
      onTouchStart={picks ? preloadOpener : undefined}
      onFocus={picks ? preloadOpener : undefined}
      onNavigate={(event) => {
        if (picks && pickResumeFile()) event.preventDefault();
      }}
      className={buttonClasses({
        size: "lg",
        className: cn("w-full max-w-full sm:w-auto sm:max-w-md", className),
      })}
    >
      {savedTitle ? (
        <span className="truncate">{fmt(copy.continueWith, { title: savedTitle })}</span>
      ) : (
        copy.check
      )}
      {opening ? <Spinner className="size-5" /> : <ArrowRight />}
    </IntentLink>
  );
}
