"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from "react";
import { errorMessage } from "@/components/account/errors";
import { useSessionUserId } from "@/components/account/session-user";
import { OttoCheer } from "@/components/mascot/otto-cheer";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useFormat, useMessages } from "@/i18n/client";
import { rich } from "@/i18n/rich";
import { CAREER_LOG_ROUTE } from "@/lib/career-log/links";
import { dayLabel } from "@/lib/career-log/month";
import type { CareerLogSettings } from "@/lib/career-log/types";
import { browserTimeZone, offerShows, saveSettings, useCareerLog } from "./use-career-log";

type Answer = "yes" | "not_now";

export type CareerLogOfferProps = {
  // An application reached Offer: the card may ask.
  moment: boolean;
  // "I got the job" was pressed: the card asks even if it was rested.
  hired?: boolean;
  job?: { role: string; company: string };
};

// Once a card is up it stays until it's answered, even while its data refetches.
function useAskedOnce(shows: boolean): boolean {
  const [asked, setAsked] = useState(false);
  if (shows && !asked) setAsked(true);
  return asked || shows;
}

// One question, two keys, nothing ticked for the person: Yes starts the monthly check-in, Not now rests the card for 30 days.
export function CareerLogOffer({ moment, hired = false, job }: CareerLogOfferProps) {
  const userId = useSessionUserId();
  const { data } = useCareerLog(userId, moment || hired);
  const settings = data?.settings;
  const shown = useAskedOnce(Boolean(settings && (hired || (moment && offerShows(settings)))));
  const [answered, setAnswered] = useState<{ answer: Answer; settings: CareerLogSettings } | null>(
    null,
  );
  const doneRef = useRef<HTMLParagraphElement>(null);
  const titleId = useId();
  const savedJob = useRef(false);
  const words = useMessages("careerLog");
  const t = words.offer;
  const format = useFormat();

  // "I got the job" with check-ins already on still files the job, so the log knows it.
  useEffect(() => {
    if (!hired || !userId || !job || !settings?.checkins || savedJob.current) return;
    savedJob.current = true;
    void saveSettings(userId, { job }).catch(() => undefined);
  }, [hired, userId, job, settings?.checkins]);

  useEffect(() => {
    if (answered) doneRef.current?.focus();
  }, [answered]);

  if (!userId || !settings || !shown) return null;

  async function answer(choice: Answer) {
    if (!userId) return;
    try {
      const next = await saveSettings(
        userId,
        choice === "yes"
          ? { checkins: true, timeZone: browserTimeZone(), ...(job ? { job } : {}) }
          : { promptSnoozed: true },
      );
      setAnswered({ answer: choice, settings: next });
    } catch (error) {
      toast({ title: words.couldntSave, description: errorMessage(error), variant: "error" });
    }
  }

  if (answered || (hired && settings.checkins)) {
    const on = answered ? answered.settings : settings;
    return (
      <Done ref={doneRef} title={hired ? t.hired : t.offered}>
        {rich(
          answered?.answer === "not_now" ? t.notNow : on.nextCheckinOn ? t.onNext : t.on,
          {
            link: (chunk) => (
              <Link href={CAREER_LOG_ROUTE} className="font-medium text-ink underline">
                {chunk}
              </Link>
            ),
          },
          on.nextCheckinOn ? { day: dayLabel(on.nextCheckinOn, format) } : undefined,
        )}
      </Done>
    );
  }

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-2xl bg-surface p-4 motion-safe:animate-fade-in sm:flex-row sm:items-center sm:gap-6 sm:p-5"
    >
      <div
        aria-hidden
        className="flex h-28 shrink-0 items-end justify-center overflow-hidden rounded-xl bg-surface-muted sm:h-32 sm:w-40"
      >
        <OttoCheer className="-mb-1" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h2 id={titleId} className="font-sans text-base/6 font-medium text-pretty text-ink">
          {hired ? t.hired : t.offered}
        </h2>
        <p className="font-display text-xl/7 text-pretty text-ink sm:text-2xl/8">
          {rich(t.ask, { b: (chunk) => <mark className="highlighter text-ink">{chunk}</mark> })}
        </p>
        <p className="text-sm/6 text-pretty text-muted">{t.body}</p>
      </div>
      <div className="flex shrink-0 gap-2 max-sm:w-full">
        <Button variant="ghost" onClick={() => void answer("not_now")} className="max-sm:flex-1">
          {t.no}
        </Button>
        <Button onClick={() => void answer("yes")} className="max-sm:flex-1">
          {t.yes}
        </Button>
      </div>
    </section>
  );
}

function Done({
  ref,
  title,
  children,
}: {
  ref: Ref<HTMLParagraphElement>;
  title: string;
  children: ReactNode;
}) {
  return (
    <p
      ref={ref}
      tabIndex={-1}
      role="status"
      className="rounded-2xl bg-surface px-4 py-4 text-sm/6 text-muted outline-none sm:px-6"
    >
      <span className="font-medium text-ink">{title}</span> {children}
    </p>
  );
}
