"use client";

import Link from "next/link";
import { useId } from "react";
import { Lazy } from "@/components/ui/lazy";
import { isInAppPath, type Notification } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";
import { FollowUpActions } from "./follow-up-actions";
import { asksOutcome, interviewOutcomeActions } from "./outcome-actions";
import { timeAgo } from "./time-ago";
import { useFormat, useMessagesOr } from "@/i18n/client";
import EN_APP from "@/i18n/messages/en/app";
import EN_UI from "@/i18n/messages/en/ui";

export type NotificationListProps = {
  items: readonly Notification[];
  fresh: ReadonlySet<string>;
  now: number;
  onNavigate: () => void;
};

export function NotificationList({ items, fresh, now, onNavigate }: NotificationListProps) {
  return (
    <ul className="flex flex-col">
      {items.map((item) => (
        <NotificationRow
          key={item.id}
          item={item}
          isNew={item.readAt === null || fresh.has(item.id)}
          now={now}
          onNavigate={onNavigate}
        />
      ))}
    </ul>
  );
}

const ROW = "flex gap-2.5 rounded-lg px-2.5 py-2.5 text-left -outline-offset-2";

function NotificationRow({
  item,
  isNew,
  now,
  onNavigate,
}: {
  item: Notification;
  isNew: boolean;
  now: number;
  onNavigate: () => void;
}) {
  const titleId = useId();
  const t = useMessagesOr("ui", EN_UI).notifications;
  const app = useMessagesOr("app", EN_APP);
  const format = useFormat();
  const content = (
    <>
      <span
        aria-hidden
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          isNew ? "bg-primary" : "bg-transparent",
        )}
      />
      <span className="min-w-0 flex-1">
        <span id={titleId} className="block text-sm/5 font-medium text-pretty text-ink">
          {isNew ? <span className="sr-only">{t.new}</span> : null}
          {item.title}
        </span>
        {item.body ? (
          <span className="mt-0.5 block text-sm/5 text-pretty text-muted">{item.body}</span>
        ) : null}
        <time
          dateTime={new Date(item.createdAt).toISOString()}
          className="mt-1 block text-xs/4 text-subtle"
        >
          {now > 0 ? timeAgo(item.createdAt, now, { format, justNow: app.justNow }) : null}
        </time>
      </span>
    </>
  );
  const link = item.link !== null && isInAppPath(item.link) ? item.link : null;
  const followUp =
    item.kind === "application_follow_up" && item.followUpDue ? item.applicationId : null;
  const outcome = asksOutcome(item) ? item.applicationId : null;
  return (
    <li>
      {link ? (
        <Link
          href={link}
          onClick={onNavigate}
          className={cn(ROW, "transition-colors hover:bg-ink/5")}
        >
          {content}
        </Link>
      ) : (
        <div className={ROW}>{content}</div>
      )}
      {followUp ? (
        <FollowUpActions applicationId={followUp} describedBy={titleId} onNavigate={onNavigate} />
      ) : null}
      {outcome ? (
        <Lazy
          loader={interviewOutcomeActions}
          wanted
          props={{ applicationId: outcome, describedBy: titleId, onNavigate }}
        />
      ) : null}
    </li>
  );
}
