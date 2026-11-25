"use client";

import { Copy, PenLine, Send } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/components/site/routes";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { copyText } from "@/components/ui/copy-text";
import { useFormat, useMessages } from "@/i18n/client";
import type { Format } from "@/i18n/intl";
import type { Resume } from "@/lib/resume/schema";
import type { Writing } from "@/lib/writings/schema";
import { formatDay, type ApplicationsMessages } from "../../i18n";
import { KIND_NAMES } from "../../letters/entries";
import { HubCard } from "./hub-sections";

export type HubLetter = {
  key: string;
  kind: Writing["kind"];
  question: string;
  // Outreach messages only; their text is the email.
  subject: string;
  text: string;
  at: number;
  onCopy: boolean;
};

export function hubTally(
  letters: readonly HubLetter[],
  { hub }: ApplicationsMessages,
  format: Format,
): string {
  return (["letter", "answer", "outreach"] as const)
    .map((kind) => {
      const count = letters.filter((letter) => letter.kind === kind).length;
      return count ? format.plural(hub.tally[kind], count) : null;
    })
    .filter(Boolean)
    .join(" · ");
}

export function hubLetters(
  writings: readonly Writing[],
  copy: Resume | null,
  copyLetter: string,
): HubLetter[] {
  const letters: HubLetter[] = writings.map((writing) => ({
    key: writing.id,
    kind: writing.kind,
    question: writing.question,
    subject: writing.outreach?.subject ?? "",
    text: writing.text,
    at: writing.createdAt,
    onCopy: false,
  }));
  const same = (a: string, b: string) => a.trim() === b.trim();
  if (copy?.tailor && copyLetter && !writings.some((writing) => same(writing.text, copyLetter))) {
    letters.push({
      key: `copy:${copy.id}`,
      kind: "letter",
      question: "",
      subject: "",
      text: copyLetter,
      at: copy.tailor.createdAt,
      onCopy: true,
    });
  }
  return letters.sort((a, b) => b.at - a.at);
}

// The page's list with a saved or edited message in it, so it shows without a reload.
export function withWriting(writings: readonly Writing[], writing: Writing): Writing[] {
  return writings.some((item) => item.id === writing.id)
    ? writings.map((item) => (item.id === writing.id ? writing : item))
    : [writing, ...writings];
}

export function LettersCard({
  letters,
  now,
  pro,
  onWrite,
  onOutreach,
}: {
  letters: HubLetter[];
  now: number;
  pro: boolean | null;
  onWrite: () => void;
  onOutreach: () => void;
}) {
  const t = useMessages("applications");
  const { hub } = t;
  const format = useFormat();
  const meta = letters.length ? hubTally(letters, t, format) : undefined;
  const messaged = letters.some((letter) => letter.kind === "outreach");
  const proBadge =
    pro === false ? (
      <Badge variant="ink" className="h-5 px-1.5">
        Pro
      </Badge>
    ) : null;
  return (
    <HubCard id="letters" title={hub.letters} meta={meta}>
      {letters.length > 0 ? (
        <ul className="divide-y divide-border border-y border-border">
          {letters.map((letter) => (
            <li
              key={letter.key}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-xs/5 text-subtle">
                  <Badge>{hub.kinds[letter.kind]}</Badge>
                  {letter.onCopy ? hub.onCopy : formatDay(format, letter.at, now || letter.at)}
                </p>
                {letter.question || letter.subject ? (
                  <p className="mt-1.5 text-sm/6 font-medium text-ink">
                    {letter.question || letter.subject}
                  </p>
                ) : null}
                <p className="mt-1 line-clamp-3 text-sm/6 whitespace-pre-line text-muted">
                  {letter.text}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() => void copyText(letter.text, KIND_NAMES[letter.kind].copy)}
              >
                <Copy aria-hidden />
                {letter.kind === "outreach" ? hub.copyEmail : hub.copy}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm/6 text-muted">{hub.noLetters}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onWrite}>
          <PenLine aria-hidden />
          {hub.writeLetter}
          {proBadge}
        </Button>
        <Button variant="secondary" size="sm" onClick={onOutreach}>
          <Send aria-hidden />
          {messaged ? hub.openOutreach : hub.writeOutreach}
          {messaged ? null : proBadge}
        </Button>
        {letters.length > 0 ? (
          <Link
            href={ROUTES.dashboardLetters}
            className={buttonClasses({
              variant: "ghost",
              size: "sm",
              className: "text-muted hover:text-ink",
            })}
          >
            {hub.allLetters}
          </Link>
        ) : null}
      </div>
    </HubCard>
  );
}
