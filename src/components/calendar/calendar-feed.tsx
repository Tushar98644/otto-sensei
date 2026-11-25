"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CalendarSync, Copy, RotateCcw } from "lucide-react";
import { useId, useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { useSessionUserId } from "@/components/account/session-user";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { copyText } from "@/components/ui/copy-text";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api/client";
import type { FeedLinks } from "@/lib/calendar/types";
import { getQueryClient, useAppQueryClient } from "@/lib/queries/client";
import { useMessagesOr } from "@/i18n/client";
import EN_APP from "@/i18n/messages/en/app";
import EN_CALENDAR from "@/i18n/messages/en/calendar";

const feedKey = (userId: string) => ["calendar-feed", userId] as const;

// The first ask makes the account's link, so it's asked for only where the card shows.
function useCalendarFeed(userId: string | null) {
  const client = useAppQueryClient();
  return useQuery(
    {
      queryKey: feedKey(userId ?? ""),
      queryFn: async (): Promise<FeedLinks> => (await api.calendarFeed()).links,
      staleTime: Number.POSITIVE_INFINITY,
      enabled: userId !== null,
    },
    client,
  );
}

type CalendarWords = typeof EN_CALENDAR;

function useCalendarWords(): CalendarWords {
  return useMessagesOr("calendar", EN_CALENDAR);
}

function Links({ links, renewable }: { links: FeedLinks; renewable: boolean }) {
  const t = useCalendarWords();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <a
          href={links.google}
          target="_blank"
          rel="noopener"
          className={buttonClasses({
            variant: "secondary",
            size: "sm",
            className: "max-sm:flex-1",
          })}
        >
          {t.google}
          <ArrowUpRight aria-hidden />
          <span className="sr-only">{t.googleNewTab}</span>
        </a>
        <a
          href={links.webcal}
          className={buttonClasses({
            variant: "secondary",
            size: "sm",
            className: "max-sm:flex-1",
          })}
        >
          {t.apple}
        </a>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            void copyText(links.https, "calendar link in your calendar app", {
              words: {
                copied: t.copied,
                paste: t.paste,
                cantCopy: t.cantCopy,
                selectText: t.selectText,
              },
            })
          }
        >
          <Copy aria-hidden />
          {t.copy}
        </Button>
      </div>
      <p className="max-w-prose text-xs/5 text-pretty text-subtle">
        {renewable ? t.noteRenewable : t.note}
      </p>
    </div>
  );
}

function Renew({ userId }: { userId: string }) {
  const t = useCalendarWords();
  const app = useMessagesOr("app", EN_APP);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const hintId = useId();

  async function renew() {
    setBusy(true);
    try {
      const { links } = await api.calendarFeed({ renew: true });
      getQueryClient().setQueryData(feedKey(userId), links);
      setAsking(false);
      toast({
        title: t.renewed,
        description: t.renewedNote,
        variant: "success",
      });
    } catch (error) {
      toast({
        title: t.renewFailed,
        description: errorMessage(error, app.errors),
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  if (!asking) {
    return (
      <Button variant="ghost" size="sm" className="self-start" onClick={() => setAsking(true)}>
        <RotateCcw aria-hidden />
        {t.renew}
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-describedby={hintId}>
      <p id={hintId} className="text-sm/6 text-muted">
        {t.renewHint}
      </p>
      <Button variant="secondary" size="sm" loading={busy} onClick={() => void renew()}>
        {t.renew}
      </Button>
      <Button variant="ghost" size="sm" disabled={busy} onClick={() => setAsking(false)}>
        {t.cancel}
      </Button>
    </div>
  );
}

// "Subscribe" keys for the private feed: the Interview prep page shows them, Account adds "Make a new link".
export function CalendarFeed({ renewable = false }: { renewable?: boolean }) {
  const userId = useSessionUserId();
  const feed = useCalendarFeed(userId);
  const t = useCalendarWords();
  const app = useMessagesOr("app", EN_APP);
  if (!userId) return null;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-w-0 gap-3.5">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-muted"
        >
          <CalendarSync className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="font-sans text-base/6 font-medium text-pretty text-ink">{t.title}</p>
          <p className="mt-1 max-w-prose text-sm/6 text-pretty text-muted">{t.intro}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:pl-12.5">
        {feed.data ? (
          <>
            <Links links={feed.data} renewable={renewable} />
            {renewable ? <Renew userId={userId} /> : null}
          </>
        ) : feed.isError && feed.fetchStatus === "idle" ? (
          <Alert
            variant="error"
            title={t.loadFailed}
            action={
              <Button variant="secondary" size="sm" onClick={() => void feed.refetch()}>
                {t.tryAgain}
              </Button>
            }
          >
            {errorMessage(feed.error, app.errors)}
          </Alert>
        ) : (
          <div aria-busy className="flex flex-wrap gap-2">
            <span className="sr-only" role="status">
              {t.loading}
            </span>
            <Skeleton aria-hidden className="h-9 w-56 rounded-lg" />
            <Skeleton aria-hidden className="h-9 w-32 rounded-lg" />
            <Skeleton aria-hidden className="h-9 w-28 rounded-lg" />
          </div>
        )}
      </div>
    </div>
  );
}
