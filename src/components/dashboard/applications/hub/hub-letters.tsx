"use client";

import { Copy, PenLine, Send } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/components/site/routes";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { copyText } from "@/components/ui/copy-text";
import { ProMark } from "@/components/ui/pro-mark";
import type { Resume } from "@/lib/resume/schema";
import { pluralize } from "@/lib/utils";
import type { Writing } from "@/lib/writings/schema";
import { KIND_NAMES } from "../../letters/entries";
import { formatDay } from "../view";
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

export function hubTally(letters: readonly HubLetter[]): string {
  return (["letter", "answer", "outreach"] as const)
    .map((kind) => {
      const count = letters.filter((letter) => letter.kind === kind).length;
      return count ? pluralize(count, KIND_NAMES[kind].one) : null;
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
  const meta = letters.length ? hubTally(letters) : undefined;
  const messaged = letters.some((letter) => letter.kind === "outreach");
  const proBadge = pro === false ? <ProMark /> : null;
  return (
    <HubCard id="letters" title="Letters and messages" meta={meta}>
      {letters.length > 0 ? (
        <ul className="divide-y divide-border border-y border-border">
          {letters.map((letter) => (
            <li
              key={letter.key}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-xs/5 text-subtle">
                  <Badge>{KIND_NAMES[letter.kind].label}</Badge>
                  {letter.onCopy ? "On your tailored copy" : formatDay(letter.at, now || letter.at)}
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
                {letter.kind === "outreach" ? "Copy email" : "Copy"}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm/6 text-muted">
          No letter or message yet. What you write for this job shows up here by itself.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onWrite}>
          <PenLine aria-hidden />
          Write a cover letter
          {proBadge}
        </Button>
        <Button variant="secondary" size="sm" onClick={onOutreach}>
          <Send aria-hidden />
          {messaged ? "Open your outreach message" : "Write an outreach message"}
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
            All letters and messages
          </Link>
        ) : null}
      </div>
    </HubCard>
  );
}
