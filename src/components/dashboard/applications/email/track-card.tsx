"use client";

import {
  Check,
  ChevronDown,
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
import { useEffect, useState, type ReactNode } from "react";
import { useTryProLabel } from "@/components/account/pro-tools";
import { openUpgradePrompt } from "@/components/account/upgrade-prompt";
import { timeAgo } from "@/components/notifications/time-ago";
import { useNow } from "@/components/studio/use-now";
import { Button, buttonClasses } from "@/components/ui/button";
import { copyText } from "@/components/ui/copy-text";
import { Dialog } from "@/components/ui/dialog";
import { FolderCard } from "@/components/ui/folder-card";
import { LivePill } from "@/components/ui/live-pill";
import { Menu, type MenuEntry } from "@/components/ui/menu";
import { ProMark } from "@/components/ui/pro-mark";
import { Spinner } from "@/components/ui/spinner";
import { BRAND } from "@/config/brand";
import {
  GMAIL_FILTER,
  GMAIL_FILTER_FILE,
  GMAIL_FILTERS_URL,
  GMAIL_FORWARDING_URL,
  gmailFilterFile,
  gmailSearchUrl,
  testEmailHref,
} from "@/lib/inbound/gmail-filter";
import type { EmailTrackingState, TrackingAddress } from "@/lib/inbound/types";
import { cn } from "@/lib/utils";
import { EmailArt } from "./email-art";
import { GmailButton, saveFile, useFlash } from "./gmail-button";
import { GuideVideo } from "./guide-video";
import { HandlePicker } from "./handle-picker";
import { stopTracking, trackingAction, useEmailTracking, watchForMail } from "./use-email-tracking";
import {
  changeLine,
  lastRead,
  SETUP_STEPS,
  setupStage,
  setupStep,
  splitEvents,
  type SetupStage,
} from "./view";

export const ACTIVITY_ID = "email-updates";

export function EmailTrackingPanel() {
  const { tracking, userId } = useEmailTracking();
  const [open, setOpen] = useState(false);
  if (!tracking?.available) return null;
  const { address } = tracking;

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
        watchForMail();
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
              A thank-you email adds the card. A rejection closes it. An interview invite moves it
              to Interviewing. Anything {BRAND.mascotName} isn&apos;t sure about waits for you. You
              can undo every change.
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

const FORWARD_STEPS: ReactNode[] = [
  <>
    Click the <B>Forwarding and POP/IMAP</B> tab at the top.
  </>,
  <>
    Press <B>Add a forwarding address</B>.
  </>,
  <>
    Paste your address and press <B>Next</B>.
  </>,
  <>
    A new window opens. Press <B>Proceed</B>.
  </>,
  <>
    Press <B>OK</B>.
  </>,
];

const FILTER_STEPS: ReactNode[] = [
  <>
    Press <B>Show search options</B> at the end of the search box.
  </>,
  <>
    Press <B>Create filter</B>.
  </>,
  <>
    Tick <B>Forward it to</B> and pick your Otto address.
  </>,
  <>
    Press <B>Create filter</B>.
  </>,
];

const IMPORT_STEPS: ReactNode[] = [
  <>
    Press <B>Import filters</B> at the bottom of the page.
  </>,
  <>
    Press <B>Choose File</B> and pick <B>{GMAIL_FILTER_FILE}</B> from your downloads.
  </>,
  <>
    Press <B>Open file</B>.
  </>,
  <>
    Press <B>Create filters</B>.
  </>,
];

export function SetupSteps({ address, userId }: { address: TrackingAddress; userId: string }) {
  const now = useNow();
  const stage = setupStage(address);
  const current = setupStep(stage);
  const [asked, flashAsked] = useFlash();
  const [seen, setSeen] = useState(stage);
  if (seen !== stage) {
    setSeen(stage);
    if (stage === "confirm") flashAsked();
  }
  const state = (n: number): StepState =>
    n < current ? "done" : n === current ? "current" : "later";
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs/4 font-medium tracking-widest text-subtle uppercase">
          Your Otto address
        </p>
        <AddressLine email={address.email} />
        <p className="text-sm/5 text-pretty text-subtle">
          Your handle is <span className="font-medium text-ink">{address.handle}</span>. You can
          change it in the ⋯ menu.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Progress current={current} />
        <ol className="flex flex-col">
          <Step n={1} state={state(1)} title="Add your Otto address to Gmail">
            <ForwardStep address={address} active={stage === "address"} />
          </Step>
          <Step
            n={2}
            state={state(2)}
            title="Confirm it's your Gmail"
            reopen={false}
            note={asked ? <LivePill>Gmail asked to confirm</LivePill> : null}
          >
            {address.confirm ? <ConfirmStep address={address} userId={userId} /> : null}
          </Step>
          <Step n={3} state={state(3)} title="Add a filter for job emails" last>
            <FilterStep address={address} active={stage === "filter"} />
          </Step>
        </ol>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-4">
        <a
          href={testEmailHref(address.email)}
          onClick={watchForMail}
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

function AddressLine({ email, onTint = false }: { email: string; onTint?: boolean }) {
  const [name, domain] = email.split("@");
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <p
        className={cn(
          "min-w-0 flex-1 rounded-xl px-3.5 py-2.5 font-mono text-sm/6 break-words text-ink select-all",
          onTint ? "bg-surface" : "bg-surface-muted",
        )}
      >
        {name}@<wbr />
        {domain}
      </p>
      <Button
        variant="secondary"
        onClick={() => void copyText(email, "address")}
        className="max-sm:w-full"
      >
        <Copy aria-hidden />
        Copy
      </Button>
    </div>
  );
}

function Progress({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-3">
      <p className="shrink-0 text-xs/4 font-medium tracking-widest text-subtle uppercase">
        {current > SETUP_STEPS ? "All set" : `Step ${current} of ${SETUP_STEPS}`}
      </p>
      <span aria-hidden className="flex max-w-40 flex-1 gap-1">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={cn(
              "h-1 flex-1 rounded-full",
              n < current ? "bg-primary" : n === current ? "bg-primary/40" : "bg-surface-strong",
            )}
          />
        ))}
      </span>
    </div>
  );
}

type StepState = "done" | "current" | "later";

// Only the step to do now is open; done and later steps fold to one line and open with Show steps.
function Step({
  n,
  title,
  state,
  last = false,
  reopen = true,
  note,
  children,
}: {
  n: number;
  title: string;
  state: StepState;
  last?: boolean;
  reopen?: boolean;
  note?: ReactNode;
  children: ReactNode;
}) {
  const [again, setAgain] = useState(false);
  const open = state === "current" || (state !== "current" && reopen && again);
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
          state === "done"
            ? "bg-primary text-white"
            : state === "current"
              ? "bg-surface text-ink ring-2 ring-ink"
              : "bg-surface-muted text-subtle",
        )}
      >
        {state === "done" ? <Check className="size-3.5" strokeWidth={2.5} /> : n}
      </span>
      <div className={cn("flex min-w-0 flex-col gap-4", last ? "" : open ? "pb-8" : "pb-5")}>
        <div className="flex min-h-7 items-center justify-between gap-3">
          <p
            className={cn(
              "min-w-0 text-sm/6 font-semibold",
              state === "later" ? "text-subtle" : "text-ink",
            )}
          >
            {title}
            {state === "done" ? <span className="sr-only"> (done)</span> : null}
          </p>
          {note}
          {state !== "current" && reopen ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAgain(!again)}
              className="-my-1 -mr-3 shrink-0 text-muted"
            >
              {again ? "Hide steps" : "Show steps"}
            </Button>
          ) : null}
        </div>
        {open ? (
          <div className="@container flex flex-col gap-4 text-sm/6 text-pretty text-muted">
            {children}
          </div>
        ) : null}
      </div>
    </li>
  );
}

// True once the page was left and opened again after `armed`, as when someone comes back from Gmail.
function useCameBack(armed: boolean): boolean {
  const [back, setBack] = useState(false);
  useEffect(() => {
    if (!armed) return;
    let away = document.visibilityState === "hidden";
    const onChange = () => {
      if (document.visibilityState === "hidden") away = true;
      else if (away) setBack(true);
    };
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, [armed]);
  return back;
}

function ForwardStep({ address, active }: { address: TrackingAddress; active: boolean }) {
  const [pressed, setPressed] = useState(false);
  const back = useCameBack(pressed && active);
  return (
    <>
      <div>
        <GmailButton
          href={GMAIL_FORWARDING_URL}
          main={active}
          doneLabel="Address copied"
          onPress={() => {
            setPressed(true);
            watchForMail();
            return copyText(address.email, "address", { quiet: true });
          }}
        >
          Copy address and open Gmail
        </GmailButton>
      </div>
      {back && active ? <Waiting email={address.email} /> : null}
      <GuideVideo />
      <p>Then in Gmail:</p>
      <SubSteps items={FORWARD_STEPS} />
      {active && !back ? (
        <p className="text-subtle">Step 2 opens by itself when Gmail&apos;s email reaches Otto.</p>
      ) : null}
    </>
  );
}

function Waiting({ email }: { email: string }) {
  const [checking, setChecking] = useState(false);
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface-muted p-3 sm:p-4">
      <p role="status" className="flex items-start gap-2.5 text-ink">
        <Spinner className="mt-1 size-4 text-muted" />
        Waiting for Gmail&apos;s email to Otto… usually under a minute.
      </p>
      <div>
        <Button
          variant="link"
          size="sm"
          aria-expanded={checking}
          onClick={() => setChecking(!checking)}
        >
          Didn&apos;t work? Check the address
        </Button>
      </div>
      {checking ? (
        <div className="flex flex-col gap-3">
          <p>Gmail needs this exact address:</p>
          <AddressLine email={email} onTint />
          <SubSteps items={FORWARD_STEPS.slice(2, 3)} start={3} />
          <p>Have more than one Gmail? Check you&apos;re in the right one.</p>
        </div>
      ) : null}
    </div>
  );
}

function ConfirmStep({ address, userId }: { address: TrackingAddress; userId: string }) {
  const confirm = address.confirm!;
  const confirmed = () => void trackingAction(userId, { action: "confirmed" });
  return (
    <div className="flex flex-col gap-4 rounded-xl bg-lavender/60 p-4 inset-ring inset-ring-ink/5">
      <div className="flex flex-col gap-1">
        <p className="text-base/6 font-semibold text-ink">Is this your Gmail?</p>
        <p className="text-sm/5 text-pretty text-muted">
          {confirm.source ? (
            <span className="font-medium break-all text-ink">{confirm.source}</span>
          ) : (
            "A Gmail account"
          )}{" "}
          asked to send its mail to {address.handle}. Confirm only if it&apos;s yours.
        </p>
      </div>
      <a
        href={confirm.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={confirmed}
        className={buttonClasses({ variant: "primary", size: "lg", className: "w-full" })}
      >
        <MailCheck aria-hidden />
        <span className="min-w-0 truncate">
          {confirm.source ? `Confirm ${confirm.source}` : "Confirm forwarding"}
        </span>
      </a>
      <div className="text-sm/6 text-pretty text-muted">
        <SubSteps
          onTint
          items={[
            <>
              Gmail opens a page. Press <B>Confirm</B> there too.
            </>,
            <>Come back here for step 3.</>,
          ]}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {confirm.code ? (
          <>
            <p className="text-sm/5 text-muted">
              Code{" "}
              <span className="font-mono text-base font-medium tracking-wider text-ink tabular-nums">
                {confirm.code}
              </span>
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void copyText(confirm.code ?? "", "code");
                confirmed();
              }}
            >
              <Copy aria-hidden />
              Copy code
            </Button>
          </>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void trackingAction(userId, { action: "not_mine" })}
        >
          Not my Gmail
        </Button>
      </div>
    </div>
  );
}

function FilterStep({ address, active }: { address: TrackingAddress; active: boolean }) {
  return (
    <>
      <div>
        <GmailButton
          href={gmailSearchUrl()}
          main={active}
          doneLabel="Filter copied"
          onPress={() => copyText(GMAIL_FILTER, "filter", { quiet: true })}
        >
          Copy filter and open Gmail search
        </GmailButton>
      </div>
      <p>Then in Gmail:</p>
      <SubSteps items={FILTER_STEPS} />
      <p>Don&apos;t turn on forwarding for all mail. The filter sends only job emails.</p>
      <Disclosure label="Or download the filter for Gmail">
        <div>
          <GmailButton
            href={GMAIL_FILTERS_URL}
            doneLabel="Filter downloaded"
            onPress={() =>
              saveFile(GMAIL_FILTER_FILE, gmailFilterFile(address.email), "application/xml")
            }
          >
            Download filter and open Gmail
          </GmailButton>
        </div>
        <p>Then in Gmail:</p>
        <SubSteps items={IMPORT_STEPS} />
      </Disclosure>
      <Disclosure label="See the filter">
        <div className="rounded-xl bg-surface-muted p-3">
          <p className="font-mono text-xs/5 break-words text-ink">{GMAIL_FILTER}</p>
        </div>
      </Disclosure>
    </>
  );
}

function Disclosure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="group/more">
      <summary className="flex min-h-9 w-fit cursor-pointer list-none items-center gap-1 text-sm text-muted hover:text-ink pointer-coarse:min-h-11 [&::-webkit-details-marker]:hidden">
        {label}
        <ChevronDown
          aria-hidden
          className="size-4 transition-transform group-open/more:rotate-180"
        />
      </summary>
      <div className="mt-3 flex flex-col gap-4">{children}</div>
    </details>
  );
}

function B({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-ink">{children}</strong>;
}

function Num({ n, onTint = false }: { n: number; onTint?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs/none font-semibold text-ink tabular-nums",
        onTint ? "bg-surface" : "bg-surface-muted",
      )}
    >
      {n}
    </span>
  );
}

function SubSteps({
  items,
  start = 1,
  onTint = false,
}: {
  items: ReactNode[];
  start?: number;
  onTint?: boolean;
}) {
  return (
    <ol start={start} className="flex flex-col gap-2">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2.5">
          <Num n={start + index} onTint={onTint} />
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ol>
  );
}
