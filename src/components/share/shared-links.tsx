"use client";

import { useMemo } from "react";
import { useMe } from "@/components/account/use-me";
import { useNow } from "@/components/studio/use-now";
import { Button } from "@/components/ui/button";
import { useFormat, useMessagesOr } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import EN_SHARE from "@/i18n/messages/en/share";
import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import type { SharedLink } from "@/lib/share/types";
import { useResumeList } from "@/lib/store/resume-store";
import { CopyLinkButton, OpenShareLink, useShareLinksWords } from "./copy-link";
import { turnOffWithUndo } from "./share-actions";
import { isBehind, viewFacts } from "./share-facts";
import { useShares } from "./share-store";

export function SharedLinks() {
  const { user } = useMe();
  const userId = user?.id ?? null;
  const words = useShareLinksWords();
  const t = words.list;
  const { links } = useShares();
  const resumes = useResumeList();
  const now = useNow();
  const byId = useMemo(() => new Map(resumes.map((resume) => [resume.id, resume])), [resumes]);

  if (!userId || links.length === 0) return null;

  return (
    <section aria-labelledby="shared-links-title" className="flex flex-col gap-4">
      <div>
        <h2 id="shared-links-title" className="font-sans text-lg/7 font-medium text-ink">
          {t.title}
        </h2>
        <p className="mt-1 max-w-prose text-sm/6 text-muted">{t.intro}</p>
      </div>
      <ul className="divide-y divide-border rounded-2xl bg-surface px-4 sm:px-6">
        {links.map((link) => (
          <SharedLinkRow
            key={link.id}
            link={link}
            resume={byId.get(link.resumeId) ?? null}
            now={now}
            onTurnOff={(target) => turnOffWithUndo(target, words.actions)}
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
  const t = useShareLinksWords().list;
  const { facts } = useMessagesOr("share", EN_SHARE);
  const format = useFormat();
  const name = resume ? resumeTitle(resume) : link.name || t.untitled;
  const details = [
    link.showContact ? t.shown : t.hidden,
    link.allowIndexing ? t.indexed : null,
    resume && isBehind(link, resume) ? t.older : null,
  ].filter(Boolean);
  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="min-w-0 flex-1">
        <p className="truncate text-base/6 font-medium text-ink">{name}</p>
        <p className="mt-0.5 text-sm/5 text-subtle">
          {now > 0 ? viewFacts(link, now, facts, format) : " "}
        </p>
        <p className="mt-0.5 text-sm/5 text-subtle">{details.join(" · ")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <CopyLinkButton
          slug={link.slug}
          variant="secondary"
          size="sm"
          label={fmt(t.copyFor, { name })}
        />
        <OpenShareLink slug={link.slug} size="sm" label={fmt(t.openFor, { name })} />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onTurnOff(link)}
          aria-label={fmt(t.turnOffFor, { name })}
          className="text-fail-ink"
        >
          {t.turnOff}
        </Button>
      </div>
    </li>
  );
}
