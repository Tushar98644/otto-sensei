"use client";

import {
  ArrowUpRight,
  Check,
  Copy,
  Ellipsis,
  ListChecks,
  Mail,
  MailCheck,
  PenLine,
  Send,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTryProLabel } from "@/components/account/pro-tools";
import { openUpgradePrompt } from "@/components/account/upgrade-prompt";
import { timeAgo } from "@/components/notifications/time-ago";
import { useNow } from "@/components/studio/use-now";
import { Button, buttonClasses } from "@/components/ui/button";
import { copyText } from "@/components/ui/copy-text";
import { Dialog } from "@/components/ui/dialog";
import { FolderCard } from "@/components/ui/folder-card";
import { Menu, type MenuEntry } from "@/components/ui/menu";
import { ProMark } from "@/components/ui/pro-mark";
import { BRAND } from "@/config/brand";
import {
  GMAIL_FILTER,
  GMAIL_FORWARDING_URL,
  gmailSearchUrl,
  testEmailHref,
} from "@/lib/inbound/gmail-filter";
import type { EmailTrackingState, TrackingAddress } from "@/lib/inbound/types";
import { cn } from "@/lib/utils";
import { EmailArt } from "./email-art";
import { HandlePicker } from "./handle-picker";
import { stopTracking, trackingAction, useEmailTracking, waitForTest } from "./use-email-tracking";
import { changeLine, lastRead, setupStage, splitEvents, type SetupStage } from "./view";

export const ACTIVITY_ID = "email-updates";

// Only the running status shows while another prompt on the page waits for its answer.
export function EmailTrackingPanel({ waiting = false }: { waiting?: boolean }) {
  const { tracking, userId } = useEmailTracking();
  const [open, setOpen] = useState(false);
  if (!tracking?.available) return null;
  const { address } = tracking;
  const working = address !== null && tracking.allowed && setupStage(address) === "working";
  if (waiting && !working && !open) return null;

  if (!tracking.allowed || !address) {
    return open ? (
      <SetupFolder tracking={tracking} userId={userId} onClose={() => setOpen(false)} />
    ) : (
      <IntroStrip locked={!tracking.allowed} onOpen={() => setOpen(true)} />
    );
  }
  const stage = setupStage(address);
  if (stage === "working" && !open) {
    return (
      <WorkingStrip
        tracking={tracking}
        address={address}
        userId={userId}
        onSetup={() => setOpen(true)}
      />
    );
  }
  return (
    <SetupFolder
      tracking={tracking}
      userId={userId}
      onClose={stage === "working" ? () => setOpen(false) : undefined}
    />
  );
}

const STRIP =
  "flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl bg-surface p-3 sm:flex-nowrap sm:p-4 motion-safe:animate-fade-in";

function Tile({ icon: Icon, live = false }: { icon: LucideIcon; live?: boolean }) {
  return (
    <span
      aria-hidden
      className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-ink"
    >
      <Icon className="size-5" />
      {live ? (
        <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-pass ring-2 ring-surface" />
      ) : null}
    </span>
  );
}

function IntroStrip({ locked, onOpen }: { locked: boolean; onOpen: () => void }) {
  return (
    <section aria-label="Track applications from email" className={STRIP}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Tile icon={Mail} />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 text-sm/5 font-semibold text-ink">
            Track applications from email
            {locked ? <ProMark /> : null}
          </p>
          <p className="mt-0.5 text-sm/5 text-pretty text-muted">
            Pick a handle for your own {BRAND.mascotName} address, forward job emails to it, and
            this board keeps itself up to date.
          </p>
        </div>
      </div>
      <Button variant="secondary" size="sm" onClick={onOpen} className="max-sm:w-full">
        {locked ? "See how it works" : "Set up"}
      </Button>
    </section>
  );
}

function WorkingStrip({
  tracking,
  address,
  userId,
  onSetup,
}: {
  tracking: EmailTrackingState;
  address: TrackingAddress;
  userId: string;
  onSetup: () => void;
}) {
  const now = useNow();
  const latest = lastRead(tracking);
  const { pending } = splitEvents(tracking);
  const changes = tracking.events.filter(
    (event) => event.change !== "none" && event.change !== "pending" && event.undoneAt === null,
  ).length;
  return (
    <section aria-label="Tracking from email" className={STRIP}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Tile icon={MailCheck} live />
        <div className="min-w-0">
          <p className="text-sm/5 font-semibold text-ink">
            Tracking from email
            {address.lastEmailAt !== null && now > 0 ? (
              <span className="font-normal text-subtle">
                {" "}
                · last email {timeAgo(address.lastEmailAt, now)}
              </span>
            ) : null}
          </p>
          {latest ? (
            <p className="mt-0.5 truncate text-sm/5 text-muted">
              <span className="text-ink">{latest.company || latest.sender}</span>:{" "}
              {changeLine(latest)}
              <span className="text-subtle"> · {latest.subject}</span>
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-1 max-sm:w-full max-sm:justify-between">
        {pending.length > 0 ? (
          <a
            href={`#${ACTIVITY_ID}`}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            {pending.length === 1 ? "1 to check" : `${pending.length} to check`}
          </a>
        ) : tracking.events.length > 0 ? (
          <a href={`#${ACTIVITY_ID}`} className={buttonClasses({ variant: "ghost", size: "sm" })}>
            {changes === 0 ? "Emails read" : changes === 1 ? "1 change" : `${changes} changes`}
          </a>
        ) : null}
        <AddressMenu address={address} userId={userId} parts={tracking.parts} onSetup={onSetup} />
      </div>
    </section>
  );
}

function AddressMenu({
  address,
  userId,
  parts,
  onSetup,
}: {
  address: TrackingAddress;
  userId: string;
  parts: EmailTrackingState["parts"];
  onSetup?: () => void;
}) {
  const [dialog, setDialog] = useState<"handle" | "stop" | null>(null);
  const [busy, setBusy] = useState(false);
  const items: MenuEntry[] = [
    ...(onSetup ? [{ label: "Show setup steps", icon: ListChecks, onSelect: onSetup }] : []),
    { label: "Copy address", icon: Copy, onSelect: () => void copyText(address.email, "address") },
    {
      label: "Send a test email",
      icon: Send,
      onSelect: () => {
        waitForTest();
        window.location.href = testEmailHref(address.email);
      },
    },
    "separator",
    {
      label: "Change handle…",
      description: "The old address works 14 more days",
      icon: PenLine,
      onSelect: () => setDialog("handle"),
    },
    { label: "Turn off…", icon: X, tone: "danger", onSelect: () => setDialog("stop") },
  ];

  async function stop() {
    setBusy(true);
    const done = await stopTracking(userId);
    setBusy(false);
    if (done) setDialog(null);
  }

  return (
    <>
      <Menu
        label="Email tracking"
        align="end"
        triggerLabel="More for email tracking"
        triggerClassName={buttonClasses({ variant: "ghost", size: "icon-sm" })}
        trigger={<Ellipsis aria-hidden />}
        items={items}
      />
      <Dialog
        open={dialog === "handle"}
        onOpenChange={(next) => (next ? null : setDialog(null))}
        title="Change your handle"
        description="Your current address keeps taking mail for 14 days, so there's time to put the new one in Gmail's forwarding settings and your filter."
      >
        <HandlePicker
          initial={address.handle}
          current={address.handle}
          parts={parts}
          submitLabel="Use this handle"
          onCancel={() => setDialog(null)}
          onSubmit={async (handle) => {
            const done = await trackingAction(userId, { action: "handle", handle });
            if (done) setDialog(null);
            return done;
          }}
        />
      </Dialog>
      <Dialog
        open={dialog === "stop"}
        onOpenChange={(next) => (next ? null : setDialog(null))}
        size="sm"
        title="Turn off tracking from email?"
        description={`${address.email} stops taking mail at once, so nothing more moves on its own. The updates already made stay, and ${address.handle} stays yours to take back for 90 days.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={() => void stop()} aria-busy={busy} disabled={busy}>
              Turn off
            </Button>
          </>
        }
      />
    </>
  );
}

const STATUS: Record<SetupStage, string> = {
  address: "waiting for Gmail's confirmation email",
  confirm: "Gmail wants to confirm forwarding",
  filter: "forwarding confirmed",
  working: "reading your job emails",
};

function SetupFolder({
  tracking,
  userId,
  onClose,
}: {
  tracking: EmailTrackingState;
  userId: string;
  onClose?: () => void;
}) {
  const tryPro = useTryProLabel();
  const now = useNow();
  const { address } = tracking;
  const stage = address ? setupStage(address) : null;
  const meta =
    stage === "working" && address?.lastEmailAt != null && now > 0
      ? `last email read ${timeAgo(address.lastEmailAt, now)}`
      : stage
        ? STATUS[stage]
        : "reads each email once and keeps only what changed";
  return (
    <FolderCard
      tab="Track automatically"
      tabEnd={
        <div className="flex items-center gap-1">
          {address ? (
            <AddressMenu address={address} userId={userId} parts={tracking.parts} />
          ) : null}
          {onClose ? (
            <Button variant="ghost" size="icon-sm" aria-label="Hide setup" onClick={onClose}>
              <X aria-hidden />
            </Button>
          ) : null}
        </div>
      }
      bodyClassName="p-2"
      className="motion-safe:animate-fade-in"
    >
      <div className="group/otto grid gap-2 md:grid-cols-[minmax(0,1fr)_17rem] lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="flex min-w-0 flex-col gap-6 px-3 pt-4 pb-3 sm:px-5 sm:py-6 lg:px-6">
          <div className="flex flex-col gap-2">
            <p className="text-sm/5 text-subtle">
              <span className="font-medium text-ink">{BRAND.mascotName}</span> · {meta}
            </p>
            <p className="font-display text-2xl/8 tracking-tight text-pretty text-ink sm:text-3xl/9">
              Let job emails move your cards
            </p>
            <p className="max-w-prose text-sm/6 text-pretty text-muted">
              A thanks-for-applying email adds the card as Applied. A rejection closes it. An
              interview invite moves it to Interviewing with the day and time. Mail from your own
              Gmail or a hiring system moves cards on its own; anything else waits for you to check.
              Every change shows here with Undo.
            </p>
          </div>
          {address ? (
            <SetupSteps address={address} userId={userId} />
          ) : tracking.allowed ? (
            <HandlePicker
              initial={tracking.suggestion}
              parts={tracking.parts}
              submitLabel="Get my address"
              onSubmit={(handle) => trackingAction(userId, { action: "start", handle })}
            />
          ) : (
            <div className="flex flex-col items-start gap-3">
              <Button onClick={() => openUpgradePrompt("tracker")} className="max-sm:w-full">
                {tryPro}
              </Button>
              <p className="text-sm/5 text-pretty text-subtle">
                Free tracks one application, so tracking from email comes with Pro.
              </p>
            </div>
          )}
        </div>
        <EmailArt className="max-md:order-first max-md:h-32 md:sticky md:top-6 md:h-64 md:self-start" />
      </div>
    </FolderCard>
  );
}

function SetupSteps({ address, userId }: { address: TrackingAddress; userId: string }) {
  const now = useNow();
  const stage = setupStage(address);
  const confirmed = stage === "filter" || stage === "working";
  const asked = confirmed || stage === "confirm";
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-xs/4 font-medium tracking-widest text-subtle uppercase">
          Your Otto address
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <p className="min-w-0 flex-1 rounded-xl bg-surface-muted px-3.5 py-2.5 font-mono text-sm/6 break-words text-ink select-all">
            {address.email.split("@")[0]}@<wbr />
            {address.email.split("@")[1]}
          </p>
          <Button
            variant="secondary"
            onClick={() => void copyText(address.email, "address")}
            className="max-sm:w-full"
          >
            <Copy aria-hidden />
            Copy
          </Button>
        </div>
        <p className="text-sm/5 text-pretty text-subtle">
          Your handle is <span className="font-medium text-ink">{address.handle}</span>. Change it
          from the ⋯ menu any time; the old address keeps working for 14 days.
        </p>
      </div>

      <ol className="flex flex-col">
        <Step n={1} done={asked} title="Add it to Gmail as a forwarding address">
          <p>
            Gmail settings, See all settings, Forwarding and POP/IMAP, then Add a forwarding
            address. Paste the address and press Next, Proceed and OK.
          </p>
          <div>
            <a
              href={GMAIL_FORWARDING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              Open Gmail&apos;s forwarding settings
              <ArrowUpRight aria-hidden />
            </a>
          </div>
        </Step>
        <Step n={2} done={confirmed} current={!confirmed} title="Confirm it here">
          {stage === "confirm" && address.confirm ? (
            <ConfirmCallout address={address} userId={userId} />
          ) : confirmed ? (
            <p className="flex items-center gap-1.5 text-ink">
              <Check aria-hidden className="size-4 text-pass" />
              Forwarding confirmed.
            </p>
          ) : (
            <p className="flex items-start gap-2">
              <span
                aria-hidden
                className="mt-2 size-2 shrink-0 rounded-full bg-border-strong motion-safe:animate-pulse"
              />
              Waiting for Gmail&apos;s confirmation email. It shows up here a few seconds after step
              1.
            </p>
          )}
        </Step>
        <Step
          n={3}
          done={stage === "working"}
          current={stage === "filter"}
          title="Add a filter that forwards job emails"
          last
        >
          <div className="rounded-xl bg-surface-muted p-3">
            <p className="font-mono text-xs/5 break-words text-ink">{GMAIL_FILTER}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void copyText(GMAIL_FILTER, "filter")}
            >
              <Copy aria-hidden />
              Copy filter
            </Button>
            <a
              href={gmailSearchUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              Search it in Gmail
              <ArrowUpRight aria-hidden />
            </a>
          </div>
          <p>
            With the search open, press Show search options at the right of the search box, then
            Create filter. Tick Forward it to, pick your Otto address and press Create filter. Leave
            forwarding itself off: the filter sends only these.
          </p>
        </Step>
      </ol>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-4">
        <a
          href={testEmailHref(address.email)}
          onClick={waitForTest}
          className={buttonClasses({ variant: "secondary", size: "sm" })}
        >
          <Send aria-hidden />
          Send a test
        </a>
        <p className="text-sm/5 text-pretty text-muted">
          {address.testAt !== null && now > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-ink">
              <Check aria-hidden className="size-4 text-pass" />
              Test received {timeAgo(address.testAt, now)}. Your address works.
            </span>
          ) : (
            "Opens a new email to your address with the subject Otto test. Send it and it shows up here."
          )}
        </p>
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  done,
  current = false,
  last = false,
  children,
}: {
  n: number;
  title: string;
  done: boolean;
  current?: boolean;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <li className="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3">
      {last ? null : (
        <span
          aria-hidden
          className="absolute top-8 bottom-1 left-3.5 w-px -translate-x-1/2 bg-border"
        />
      )}
      <span
        aria-hidden
        className={cn(
          "relative flex size-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
          done
            ? "bg-primary text-white"
            : current
              ? "bg-surface text-ink ring-2 ring-ink"
              : "bg-surface-muted text-muted",
        )}
      >
        {done ? <Check className="size-3.5" strokeWidth={2.5} /> : n}
      </span>
      <div className={cn("flex min-w-0 flex-col gap-2.5 pt-0.5", last ? "" : "pb-6")}>
        <p className="text-sm/6 font-semibold text-ink">
          {title}
          {done ? <span className="sr-only"> (done)</span> : null}
        </p>
        <div className="flex flex-col gap-2.5 text-sm/6 text-pretty text-muted">{children}</div>
      </div>
    </li>
  );
}

function ConfirmCallout({ address, userId }: { address: TrackingAddress; userId: string }) {
  const confirm = address.confirm!;
  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-xl bg-lavender/60 p-4 inset-ring inset-ring-ink/5"
    >
      <div className="flex flex-col gap-1">
        <p className="text-base/6 font-semibold text-ink">
          Gmail wants to confirm forwarding: press Confirm
        </p>
        {confirm.source ? (
          <p className="text-sm/5 text-pretty text-muted">
            <span className="font-medium break-all text-ink">{confirm.source}</span> asked to
            forward its mail to {address.handle}. Confirm only if that&apos;s your Gmail: its mail
            then moves your cards on its own.
          </p>
        ) : null}
        {confirm.code ? (
          <p className="text-sm/5 text-muted">
            Code{" "}
            <span className="font-mono text-base font-medium tracking-wider text-ink tabular-nums">
              {confirm.code}
            </span>
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          href={confirm.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => void trackingAction(userId, { action: "confirmed" })}
          className={buttonClasses({ variant: "primary", size: "sm" })}
        >
          <MailCheck aria-hidden />
          Confirm
        </a>
        {confirm.code ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void copyText(confirm.code ?? "", "code");
              void trackingAction(userId, { action: "confirmed" });
            }}
          >
            <Copy aria-hidden />
            Copy code
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void trackingAction(userId, { action: "not_mine" })}
        >
          Not my Gmail
        </Button>
      </div>
      <p className="text-sm/5 text-pretty text-muted">
        Gmail opens a page with one more Confirm button. Press it there too, then come back for step
        3.
      </p>
    </div>
  );
}
