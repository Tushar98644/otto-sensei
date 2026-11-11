"use client";

import { useMemo } from "react";
import { useMe } from "@/components/account/use-me";
import { useNow } from "@/components/studio/use-now";
import { Button } from "@/components/ui/button";
import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import type { SharedLink } from "@/lib/share/types";
import { useResumeList } from "@/lib/store/resume-store";
import { CopyLinkButton, OpenShareLink } from "./copy-link";
import { turnOffWithUndo } from "./share-actions";
import { isBehind, viewFacts } from "./share-facts";
import { useShares } from "./share-store";

export function SharedLinks() {
  const { user } = useMe();
  const userId = user?.id ?? null;
  const { links } = useShares();
  const resumes = useResumeList();
  const now = useNow();
  const byId = useMemo(() => new Map(resumes.map((resume) => [resume.id, resume])), [resumes]);

  if (!userId || links.length === 0) return null;

  return (
    <section aria-labelledby="shared-links-title" className="flex flex-col gap-4">
      <div>
        <h2 id="shared-links-title" className="font-sans text-lg/7 font-medium text-ink">
          Shared links
        </h2>
        <p className="mt-1 max-w-prose text-sm/6 text-muted">
          Anyone with one of these links can read that resume. Views leave out link previews, search
          engines and you, while you&apos;re signed in.
        </p>
      </div>
      <ul className="divide-y divide-border rounded-2xl bg-surface px-4 sm:px-6">
        {links.map((link) => (
          <SharedLinkRow
            key={link.id}
            link={link}
            resume={byId.get(link.resumeId) ?? null}
            now={now}
            onTurnOff={turnOffWithUndo}
          />
        ))}
      </ul>
    </section>
  );
}

type RowProps = {
  link: SharedLink;
  resume: Resume | null;
  now: number;
  onTurnOff: (link: SharedLink) => void;
};

function SharedLinkRow({ link, resume, now, onTurnOff }: RowProps) {
  const name = resume ? resumeTitle(resume) : link.name || "Resume";
  const details = [
    link.showContact ? "Email and phone shown" : "Email and phone hidden",
    link.allowIndexing ? "In search results" : null,
    resume && isBehind(link, resume) ? "Older version" : null,
  ].filter(Boolean);
  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="min-w-0 flex-1">
        <p className="truncate text-base/6 font-medium text-ink">{name}</p>
        <p className="mt-0.5 text-sm/5 text-subtle">{now > 0 ? viewFacts(link, now) : " "}</p>
        <p className="mt-0.5 text-sm/5 text-subtle">{details.join(" · ")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <CopyLinkButton
          slug={link.slug}
          variant="secondary"
          size="sm"
          label={`Copy link for ${name}`}
        />
        <OpenShareLink
          slug={link.slug}
          size="sm"
          label={`Open the page for ${name} (opens in a new tab)`}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onTurnOff(link)}
          aria-label={`Turn off link for ${name}`}
          className="text-fail-ink"
        >
          Turn off
        </Button>
      </div>
    </li>
  );
}
