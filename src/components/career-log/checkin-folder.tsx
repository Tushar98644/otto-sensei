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
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import { dayLabel } from "@/lib/career-log/month";
import { checkinDayLabel, nextCheckinOn } from "@/lib/career-log/schedule";
import type { CareerLogSettings, LocalDate } from "@/lib/career-log/types";
import { CheckinArt } from "./log-art";
import { browserTimeZone, saveSettings } from "./use-career-log";

const SETTINGS = accountSectionHref("careerLog");

type CheckinWords = Messages["careerLog"]["checkin"];

export function checkinLine(
  settings: CareerLogSettings,
  emailAvailable: boolean,
  t: CheckinWords,
  format: Format,
): string {
  const how = emailAvailable && settings.emails ? t.how.email : t.how.bell;
  return fmt(t.asks, { day: checkinDayLabel(settings.day, t, format), how });
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
  const words = useMessages("careerLog");
  const t = words.checkin;
  const format = useFormat();

  async function turnOn() {
    setPending(true);
    try {
      await saveSettings(userId, { checkins: true, timeZone: browserTimeZone() });
      toast({ title: t.on, variant: "success" });
    } catch (error) {
      toast({ title: words.couldntSave, description: errorMessage(error), variant: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <FolderCard tab={t.tab} tone="lavender" bodyClassName="flex flex-col gap-2 p-2">
      <CheckinArt
        date={settings.nextCheckinOn ?? nextCheckinOn(settings.day, today)}
        on={settings.checkins}
        offLabel={t.off}
        className="h-36"
      />
      <div className="flex flex-1 flex-col items-start gap-4 px-2 pt-2 pb-3 sm:px-4">
        <div className="flex flex-col gap-2">
          <Eyebrow>{t.free}</Eyebrow>
          {settings.checkins && settings.nextCheckinOn ? (
            <>
              <p className="font-display text-2xl/8 font-normal tracking-tight text-pretty text-ink">
                {t.next}{" "}
                <mark className="highlighter text-ink">
                  {dayLabel(settings.nextCheckinOn, format)}
                </mark>
              </p>
              <p className="text-sm/6 text-pretty text-muted">
                {paused && settings.pausedUntil
                  ? fmt(t.paused, { day: dayLabel(settings.pausedUntil, format) })
                  : checkinLine(settings, emailAvailable, t, format)}
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-2xl/8 font-normal tracking-tight text-pretty text-ink">
                {t.nudge}
              </p>
              <p className="text-sm/6 text-pretty text-muted">
                {fmt(emailAvailable ? t.offIntroEmail : t.offIntro, {
                  day: checkinDayLabel(settings.day, t, format),
                })}
              </p>
            </>
          )}
        </div>
        {settings.checkins ? (
          <Link
            href={SETTINGS}
            className="group inline-flex items-center gap-1 text-sm font-medium text-ink"
          >
            {t.change}
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
            {t.turnOn}
          </Button>
        )}
      </div>
    </FolderCard>
  );
}
