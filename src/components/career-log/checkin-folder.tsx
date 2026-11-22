"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { accountSectionHref } from "@/components/setup/links";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { FolderCard } from "@/components/ui/folder-card";
import { toast } from "@/components/ui/toast";
import { dayLabel } from "@/lib/career-log/month";
import { checkinDayLabel, nextCheckinOn } from "@/lib/career-log/schedule";
import type { CareerLogSettings, LocalDate } from "@/lib/career-log/types";
import { CheckinArt } from "./log-art";
import { browserTimeZone, saveSettings } from "./use-career-log";

const SETTINGS = accountSectionHref("careerLog");

export function checkinLine(settings: CareerLogSettings, emailAvailable: boolean): string {
  const how =
    emailAvailable && settings.emails
      ? "in the bell, on Home and by email"
      : "in the bell and on Home";
  return `Otto asks on ${checkinDayLabel(settings.day)} of each month, ${how}.`;
}

export function CheckinFolder({
  userId,
  settings,
  emailAvailable,
  today,
}: {
  userId: string;
  settings: CareerLogSettings;
  emailAvailable: boolean;
  today: LocalDate;
}) {
  const [pending, setPending] = useState(false);
  const paused = settings.checkins && settings.pausedUntil !== null;

  async function turnOn() {
    setPending(true);
    try {
      await saveSettings(userId, { checkins: true, timeZone: browserTimeZone() });
      toast({ title: "Monthly check-ins are on.", variant: "success" });
    } catch (error) {
      toast({ title: "Couldn't save that", description: errorMessage(error), variant: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <FolderCard tab="Monthly check-in" tone="lavender" bodyClassName="flex flex-col gap-2 p-2">
      <CheckinArt
        date={settings.nextCheckinOn ?? nextCheckinOn(settings.day, today)}
        on={settings.checkins}
        className="h-36"
      />
      <div className="flex flex-1 flex-col items-start gap-4 px-2 pt-2 pb-3 sm:px-4">
        <div className="flex flex-col gap-2">
          <Eyebrow>Free on every plan</Eyebrow>
          {settings.checkins && settings.nextCheckinOn ? (
            <>
              <p className="font-display text-2xl/8 font-normal tracking-tight text-pretty text-ink">
                Next check-in{" "}
                <mark className="highlighter text-ink">{dayLabel(settings.nextCheckinOn)}</mark>
              </p>
              <p className="text-sm/6 text-pretty text-muted">
                {paused && settings.pausedUntil
                  ? `Paused until ${dayLabel(settings.pausedUntil)}. The ones before then are skipped.`
                  : checkinLine(settings, emailAvailable)}
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-2xl/8 font-normal tracking-tight text-pretty text-ink">
                A one-minute nudge, once a month
              </p>
              <p className="text-sm/6 text-pretty text-muted">
                Three quick questions on {checkinDayLabel(settings.day)}, in the bell and on Home
                {emailAvailable ? ", with one short email" : ""}. Off until you turn it on.
              </p>
            </>
          )}
        </div>
        {settings.checkins ? (
          <Link
            href={SETTINGS}
            className="group inline-flex items-center gap-1 text-sm font-medium text-ink"
          >
            Change the day or pause
            <ArrowRight
              aria-hidden
              className="size-4 text-muted transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        ) : (
          <Button
            variant="secondary"
            loading={pending}
            onClick={() => void turnOn()}
            className="max-sm:w-full"
          >
            Turn on check-ins
          </Button>
        )}
      </div>
    </FolderCard>
  );
}
