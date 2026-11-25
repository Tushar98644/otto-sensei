"use client";

import {
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
import { useEffect, useState, type ReactNode } from "react";
import { useTryProLabel } from "@/components/account/pro-tools";
import { openUpgradePrompt } from "@/components/account/upgrade-prompt";
import { timeAgo, type TimeWords } from "@/components/notifications/time-ago";
import { useNow } from "@/components/studio/use-now";
import { Button, buttonClasses } from "@/components/ui/button";
import { copyText, type CopyWords } from "@/components/ui/copy-text";
import { Dialog } from "@/components/ui/dialog";
import { FolderCard } from "@/components/ui/folder-card";
import { LivePill } from "@/components/ui/live-pill";
import { Menu, type MenuEntry } from "@/components/ui/menu";
import { ProMark } from "@/components/ui/pro-mark";
import { Spinner } from "@/components/ui/spinner";
import { BRAND } from "@/config/brand";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { rich, type RichTags } from "@/i18n/rich";
import {
  GMAIL_FORWARDING_URL,
  gmailCreateFilterUrl,
  testEmailHref,
} from "@/lib/inbound/gmail-filter";
import type { EmailTrackingState, TrackingAddress } from "@/lib/inbound/types";
import { cn } from "@/lib/utils";
import type { EmailMessages } from "../../i18n";
import { EmailArt } from "./email-art";
import { GmailButton, useFlash } from "./gmail-button";
import { GMAIL_FILTER_GUIDE, GuideVideo } from "./guide-video";
import { HandlePicker } from "./handle-picker";
import {
  stopTracking,
  trackingAction,
  useEmailTracking,
  useTrackingWords,
  watchForMail,
} from "./use-email-tracking";
import {
  changeLine,
  lastRead,
  justFinished,
  SETUP_STEPS,
  setupStage,
  setupStep,
  splitEvents,
  testTarget,
} from "./view";

export const ACTIVITY_ID = "email-updates";
const SETUP_ID = "email-setup";
const ALL_SET_MS = 3_500;

const BOLD: RichTags = { b: (chunk) => <B>{chunk}</B> };

// "3 minutes ago" in the reader's language.
function useTimeWords(): TimeWords {
  return { format: useFormat(), justNow: useMessages("app").justNow };
}

// What the copy toasts say for the address or the code.
function useCopyWords(what: "address" | "code"): CopyWords {
  const { copy } = useMessages("app");
  return { ...copy, paste: useMessages("email").copy[what] };
}

// A short burst over the card, unless the person asked for less motion.
function celebrate() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const card = document.getElementById(SETUP_ID)?.getBoundingClientRect();
  const x = card ? card.left + card.width / 2 : window.innerWidth / 2;
  const y = card ? card.top + card.height / 3 : window.innerHeight / 3;
  const top = Math.min(Math.max(y, 80), window.innerHeight - 80);
  void import("./confetti").then((m) => m.burst(x, top)).catch(() => {});
}

export function EmailTrackingPanel() {
  const { tracking, userId } = useEmailTracking();
  const [open, setOpen] = useState(false);
  const current = tracking?.address ? setupStage(tracking.address) : null;
  const [seen, setSeen] = useState(current);
  const [allSet, setAllSet] = useState(false);
  if (seen !== current) {
    setSeen(current);
    if (justFinished(seen, current)) setAllSet(true);
  }
  // "All set" stays a moment with the confetti, then the card folds to the strip.
  useEffect(() => {
    if (!allSet) return;
    celebrate();
    const timer = window.setTimeout(() => setAllSet(false), ALL_SET_MS);
    return () => window.clearTimeout(timer);
  }, [allSet]);
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
  if (stage === "working" && !open && !allSet) {
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
  const { intro } = useMessages("email");
  return (
    <section aria-label={intro.title} className={STRIP}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Tile icon={Mail} />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 text-sm/5 font-semibold text-ink">
            {intro.title}
            {locked ? <ProMark /> : null}
          </p>
          <p className="mt-0.5 text-sm/5 text-pretty text-muted">
            {fmt(intro.body, { name: BRAND.mascotName })}
          </p>
        </div>
      </div>
      <Button variant="secondary" size="sm" onClick={onOpen} className="max-sm:w-full">
        {locked ? intro.howItWorks : intro.setUp}
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
  const t = useMessages("email");
  const { statuses } = useMessages("applications");
  const format = useFormat();
  const time = useTimeWords();
  const now = useNow();
  const latest = lastRead(tracking);
  const { pending } = splitEvents(tracking);
  const changes = tracking.events.filter(
    (event) => event.change !== "none" && event.change !== "pending" && event.undoneAt === null,
  ).length;
  return (
    <section aria-label={t.strip.title} className={STRIP}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Tile icon={MailCheck} live />
        <div className="min-w-0">
          <p className="text-sm/5 font-semibold text-ink">
            {t.strip.title}
            {address.lastEmailAt !== null && now > 0 ? (
              <span className="font-normal text-subtle">
                {fmt(t.strip.lastEmail, { when: timeAgo(address.lastEmailAt, now, time) })}
              </span>
            ) : null}
          </p>
          {latest ? (
            <p className="mt-0.5 truncate text-sm/5 text-muted">
              <span className="text-ink">{latest.company || latest.sender}</span>:{" "}
              {changeLine(latest, { email: t, statuses, format })}
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
            {format.plural(t.strip.toCheck, pending.length)}
          </a>
        ) : tracking.events.length > 0 ? (
          <a href={`#${ACTIVITY_ID}`} className={buttonClasses({ variant: "ghost", size: "sm" })}>
            {changes === 0 ? t.strip.read : format.plural(t.strip.changes, changes)}
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
  const { menu: t } = useMessages("email");
  const words = useTrackingWords();
  const copyWords = useCopyWords("address");
  const [dialog, setDialog] = useState<"handle" | "stop" | null>(null);
  const [busy, setBusy] = useState(false);
  const items: MenuEntry[] = [
    ...(onSetup ? [{ label: t.steps, icon: ListChecks, onSelect: onSetup }] : []),
    {
      label: t.copy,
      icon: Copy,
      onSelect: () => void copyText(address.email, "address", { words: copyWords }),
    },
    {
      label: t.test,
      icon: Send,
      onSelect: () => {
        watchForMail();
        window.open(testEmailHref(testTarget(address).to), "_blank", "noopener,noreferrer");
      },
    },
    "separator",
    {
      label: t.handle,
      description: t.handleNote,
      icon: PenLine,
      onSelect: () => setDialog("handle"),
    },
    { label: t.off, icon: X, tone: "danger", onSelect: () => setDialog("stop") },
  ];

  async function stop() {
    setBusy(true);
    const done = await stopTracking(userId, words);
    setBusy(false);
    if (done) setDialog(null);
  }

  return (
    <>
      <Menu
        label={t.label}
        align="end"
        triggerLabel={t.trigger}
        triggerClassName={buttonClasses({ variant: "ghost", size: "icon-sm" })}
        trigger={<Ellipsis aria-hidden />}
        items={items}
      />
      <Dialog
        open={dialog === "handle"}
        onOpenChange={(next) => (next ? null : setDialog(null))}
        title={t.handleTitle}
        description={t.handleBody}
      >
        <HandlePicker
          initial={address.handle}
          current={address.handle}
          parts={parts}
          submitLabel={t.useHandle}
          onCancel={() => setDialog(null)}
          onSubmit={async (handle) => {
            const done = await trackingAction(userId, { action: "handle", handle }, words);
            if (done) setDialog(null);
            return done;
          }}
        />
      </Dialog>
      <Dialog
        open={dialog === "stop"}
        onOpenChange={(next) => (next ? null : setDialog(null))}
        size="sm"
        title={t.offTitle}
        description={fmt(t.offBody, { email: address.email, handle: address.handle })}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)}>
              {t.keep}
            </Button>
            <Button variant="danger" onClick={() => void stop()} aria-busy={busy} disabled={busy}>
              {t.turnOff}
            </Button>
          </>
        }
      />
    </>
  );
}

function SetupFolder({
  tracking,
  userId,
  onClose,
}: {
  tracking: EmailTrackingState;
  userId: string;
  onClose?: () => void;
}) {
  const t = useMessages("email");
  const words = useTrackingWords();
  const time = useTimeWords();
  const tryPro = useTryProLabel();
  const now = useNow();
  const { address } = tracking;
  const stage = address ? setupStage(address) : null;
  const meta =
    stage === "working" && address?.lastEmailAt != null && now > 0
      ? fmt(t.setup.lastRead, { when: timeAgo(address.lastEmailAt, now, time) })
      : stage
        ? t.stage[stage]
        : t.setup.idle;
  return (
    <FolderCard
      id={SETUP_ID}
      tab={t.setup.tab}
      tabEnd={
        <div className="flex items-center gap-1">
          {address ? (
            <AddressMenu address={address} userId={userId} parts={tracking.parts} />
          ) : null}
          {onClose ? (
            <Button variant="ghost" size="icon-sm" aria-label={t.setup.hide} onClick={onClose}>
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
              {t.setup.title}
            </p>
            <p className="max-w-prose text-sm/6 text-pretty text-muted">
              {fmt(t.setup.body, { name: BRAND.mascotName })}
            </p>
          </div>
          {address ? (
            <SetupSteps address={address} userId={userId} />
          ) : tracking.allowed ? (
            <HandlePicker
              initial={tracking.suggestion}
              parts={tracking.parts}
              submitLabel={t.setup.getAddress}
              onSubmit={(handle) => trackingAction(userId, { action: "start", handle }, words)}
            />
          ) : (
            <div className="flex flex-col items-start gap-3">
              <Button onClick={() => openUpgradePrompt("tracker")} className="max-sm:w-full">
                {tryPro}
              </Button>
              <p className="text-sm/5 text-pretty text-subtle">{t.setup.freeNote}</p>
            </div>
          )}
        </div>
        <EmailArt className="max-md:order-first max-md:h-32 md:sticky md:top-6 md:h-64 md:self-start" />
      </div>
    </FolderCard>
  );
}

function forwardSteps({ gmail }: EmailMessages): ReactNode[] {
  const { forward } = gmail;
  return [forward.tab, forward.add, forward.paste, forward.proceed, forward.ok].map((line) =>
    rich(line, BOLD),
  );
}

function filterSteps({ gmail }: EmailMessages): ReactNode[] {
  const { filter } = gmail;
  return [filter.create, filter.tick, filter.create].map((line) => rich(line, BOLD));
}

export function SetupSteps({ address, userId }: { address: TrackingAddress; userId: string }) {
  const { setup: t } = useMessages("email");
  const time = useTimeWords();
  const now = useNow();
  const stage = setupStage(address);
  const current = setupStep(stage);
  const test = testTarget(address);
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
          {t.yourAddress}
        </p>
        <AddressLine email={address.email} />
        <p className="text-sm/5 text-pretty text-subtle">
          {rich(
            t.yourHandle,
            { b: (chunk) => <span className="font-medium text-ink">{chunk}</span> },
            { handle: address.handle },
          )}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Progress current={current} />
        <ol className="flex flex-col">
          <Step n={1} state={state(1)} title={t.stepAdd}>
            <ForwardStep address={address} active={stage === "address"} />
          </Step>
          <Step
            n={2}
            state={state(2)}
            title={t.stepConfirm}
            reopen={false}
            note={asked ? <LivePill>{t.asked}</LivePill> : null}
          >
            {address.confirm ? <ConfirmStep address={address} userId={userId} /> : null}
          </Step>
          <Step n={3} state={state(3)} title={t.stepFilter} last>
            <FilterStep active={stage === "filter"} />
          </Step>
        </ol>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-4">
        <a
          href={testEmailHref(test.to)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={watchForMail}
          className={buttonClasses({ variant: "secondary", size: "sm" })}
        >
          <Send aria-hidden />
          {t.sendTest}
        </a>
        <p className="text-sm/5 text-pretty text-muted">
          {address.testAt !== null && now > 0 && stage !== "filter" ? (
            <span className="inline-flex items-center gap-1.5 text-ink">
              <Check aria-hidden className="size-4 text-pass" />
              {fmt(t.testReceived, { when: timeAgo(address.testAt, now, time) })}
            </span>
          ) : !test.viaFilter ? (
            t.testDraft
          ) : stage === "filter" ? (
            t.testFinish
          ) : (
            t.testFilter
          )}
        </p>
      </div>
    </div>
  );
}

function AddressLine({ email, onTint = false }: { email: string; onTint?: boolean }) {
  const { setup } = useMessages("email");
  const copyWords = useCopyWords("address");
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
        onClick={() => void copyText(email, "address", { words: copyWords })}
        className="max-sm:w-full"
      >
        <Copy aria-hidden />
        {setup.copy}
      </Button>
    </div>
  );
}

function Progress({ current }: { current: number }) {
  const { setup } = useMessages("email");
  return (
    <div className="flex items-center gap-3">
      <p className="shrink-0 text-xs/4 font-medium tracking-widest text-subtle uppercase">
        {current > SETUP_STEPS ? setup.allSet : fmt(setup.stepOf, { current, total: SETUP_STEPS })}
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
  const { setup } = useMessages("email");
  const [again, setAgain] = useState(false);
  const open = state === "current" || (reopen && again);
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
            {state === "done" ? <span className="sr-only">{setup.done}</span> : null}
          </p>
          {note}
          {state !== "current" && reopen ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAgain(!again)}
              className="-my-1 -mr-3 shrink-0 text-muted"
            >
              {again ? setup.hideSteps : setup.showSteps}
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
  const t = useMessages("email");
  const copyWords = useCopyWords("address");
  const [pressed, setPressed] = useState(false);
  const back = useCameBack(pressed && active);
  return (
    <>
      <div>
        <GmailButton
          href={GMAIL_FORWARDING_URL}
          main={active}
          doneLabel={t.gmail.copied}
          onPress={() => {
            setPressed(true);
            watchForMail();
            return copyText(address.email, "address", { quiet: true, words: copyWords });
          }}
        >
          {t.gmail.copyOpen}
        </GmailButton>
      </div>
      {back && active ? <Waiting email={address.email} /> : null}
      <GuideVideo labels={t.video} />
      <p>{t.gmail.then}</p>
      <SubSteps items={forwardSteps(t)} />
      {active && !back ? <p className="text-subtle">{t.gmail.opensItself}</p> : null}
    </>
  );
}

function Waiting({ email }: { email: string }) {
  const t = useMessages("email");
  const [checking, setChecking] = useState(false);
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface-muted p-3 sm:p-4">
      <p role="status" className="flex items-start gap-2.5 text-ink">
        <Spinner className="mt-1 size-4 text-muted" />
        {t.gmail.waiting}
      </p>
      <div>
        <Button
          variant="link"
          size="sm"
          aria-expanded={checking}
          onClick={() => setChecking(!checking)}
        >
          {t.gmail.check}
        </Button>
      </div>
      {checking ? (
        <div className="flex flex-col gap-3">
          <p>{t.gmail.exact}</p>
          <AddressLine email={email} onTint />
          <SubSteps items={forwardSteps(t).slice(2, 3)} start={3} />
          <p>{t.gmail.moreThanOne}</p>
        </div>
      ) : null}
    </div>
  );
}

function ConfirmStep({ address, userId }: { address: TrackingAddress; userId: string }) {
  const { gmail: t } = useMessages("email");
  const words = useTrackingWords();
  const copyWords = useCopyWords("code");
  const confirm = address.confirm!;
  const confirmed = () => void trackingAction(userId, { action: "confirmed" }, words);
  return (
    <div className="flex flex-col gap-4 rounded-xl bg-lavender/60 p-4 inset-ring inset-ring-ink/5">
      <div className="flex flex-col gap-1">
        <p className="text-base/6 font-semibold text-ink">{t.isYours}</p>
        <p className="text-sm/5 text-pretty text-muted">
          {confirm.source
            ? rich(
                t.askedFrom,
                { b: (chunk) => <span className="font-medium break-all text-ink">{chunk}</span> },
                { source: confirm.source, handle: address.handle },
              )
            : fmt(t.askedAccount, { handle: address.handle })}
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
          {confirm.source ? fmt(t.confirmSource, { source: confirm.source }) : t.confirm}
        </span>
      </a>
      <div className="text-sm/6 text-pretty text-muted">
        <SubSteps onTint items={[rich(t.confirmThere, BOLD), t.comeBack]} />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {confirm.code ? (
          <>
            <p className="text-sm/5 text-muted">
              {t.code}{" "}
              <span className="font-mono text-base font-medium tracking-wider text-ink tabular-nums">
                {confirm.code}
              </span>
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void copyText(confirm.code ?? "", "code", { words: copyWords });
                confirmed();
              }}
            >
              <Copy aria-hidden />
              {t.copyCode}
            </Button>
          </>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void trackingAction(userId, { action: "not_mine" }, words)}
        >
          {t.notMine}
        </Button>
      </div>
    </div>
  );
}

function FilterStep({ active }: { active: boolean }) {
  const t = useMessages("email");
  return (
    <>
      <div>
        <GmailButton href={gmailCreateFilterUrl()} main={active}>
          {t.gmail.openFilter}
        </GmailButton>
      </div>
      <GuideVideo src={GMAIL_FILTER_GUIDE} labels={t.video} />
      <p>{t.gmail.then}</p>
      <SubSteps items={filterSteps(t)} />
      <p>{t.gmail.shows}</p>
    </>
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
