"use client";

import { PenLine } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { useSessionUserId } from "@/components/account/session-user";
import { Button, buttonClasses } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { toast } from "@/components/ui/toast";
import { checkinPath } from "@/lib/career-log/links";
import { dayLabel, monthName, shortMonth } from "@/lib/career-log/month";
import type { LocalDate, Month } from "@/lib/career-log/types";
import { NotebookArt } from "./log-art";
import { saveEntry, useCareerLog } from "./use-career-log";

// Until that month is written or marked "Nothing new"; either answers it here.
export function CheckinHomeCard({ month }: { month: Month }) {
  const userId = useSessionUserId();
  const { data } = useCareerLog(userId);
  const titleId = useId();
  const [done, setDone] = useState<{ next: LocalDate | null } | null>(null);
  const [pending, setPending] = useState(false);
  const doneRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  if (!userId || !data) return null;
  const next = data.settings.checkins ? data.settings.nextCheckinOn : null;

  if (done) {
    return (
      <p
        ref={doneRef}
        tabIndex={-1}
        role="status"
        className="rounded-2xl bg-surface px-4 py-4 text-sm/6 text-muted outline-none sm:px-6"
      >
        <span className="font-medium text-ink">Noted: nothing new in {monthName(month)}.</span>{" "}
        {done.next ? `Otto will ask again on ${dayLabel(done.next)}.` : "See you next month."}
      </p>
    );
  }
  if (data.entries.some((entry) => entry.month === month)) return null;

  async function nothingNew() {
    if (!userId) return;
    setPending(true);
    try {
      await saveEntry(userId, month, { nothingNew: true });
      setDone({ next });
    } catch (error) {
      toast({ title: "Couldn't save that", description: errorMessage(error), variant: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-2xl bg-surface p-2 motion-safe:animate-fade-in sm:flex-row sm:items-center sm:gap-6 sm:pr-6"
    >
      <NotebookArt label={shortMonth(month)} className="h-32 shrink-0 sm:w-60" delay={-2.6} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-2 sm:px-0">
        <Eyebrow>Career log · one minute</Eyebrow>
        <h2
          id={titleId}
          className="font-display text-2xl/8 font-normal tracking-tight text-pretty text-ink"
        >
          Your {monthName(month)} check-in
        </h2>
        <p className="text-sm/6 text-pretty text-muted">
          What you shipped, any numbers, and anything you learned or led. A few words is plenty.
        </p>
      </div>
      <div className="flex shrink-0 flex-col-reverse gap-2 px-2 pb-2 sm:flex-row sm:p-0">
        <Button variant="ghost" loading={pending} onClick={() => void nothingNew()}>
          Nothing new
        </Button>
        <Link href={checkinPath(month)} className={buttonClasses()}>
          <PenLine aria-hidden />
          Write my check-in
        </Link>
      </div>
    </section>
  );
}
