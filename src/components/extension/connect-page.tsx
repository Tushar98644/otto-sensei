"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { loginHref } from "@/components/account/next-path";
import { useMe } from "@/components/account/use-me";
import { Otto } from "@/components/mascot/otto";
import { OttoNote } from "@/components/mascot/otto-note";
import { ROUTES } from "@/components/site/routes";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { LivePill } from "@/components/ui/live-pill";
import { fmt } from "@/i18n/format";
import type { Messages } from "@/i18n/messages";
import { api } from "@/lib/api/client";
import { CHROME_STORE_URL } from "@/lib/extension/store";
import {
  PAGE_SOURCE,
  readExtensionMessage,
  type ExtensionMessage,
  type PageMessage,
} from "@/lib/extension/bridge";
import { CONNECT_PATH } from "@/lib/extension/links";

type Step =
  | { kind: "looking" }
  | { kind: "missing" }
  | { kind: "connecting" }
  | { kind: "connected"; email: string }
  | { kind: "failed"; message: string };

export type ConnectWords = Messages["account"]["extension"]["connect"];

// The bridge script loads with the page, but may answer a moment after it.
const LOOK_MS = 2_500;
const SITES = ["LinkedIn", "Naukri", "Indeed", "Greenhouse", "Lever", "Ashby", "Workday"];

function post(message: PageMessage) {
  window.postMessage(message, window.location.origin);
}

// The page has no messages provider: its server page hands these words over.
export function ConnectPage({ words }: { words: ConnectWords }) {
  const router = useRouter();
  const { user, loading } = useMe();
  const [step, setStep] = useState<Step>({ kind: "looking" });
  const [attempt, setAttempt] = useState(0);
  const started = useRef(-1);

  async function connect(ready: Extract<ExtensionMessage, { type: "ready" }>) {
    if (!user || started.current === attempt) return;
    started.current = attempt;
    // Already connected to this account: nothing new to hand over.
    if (ready.email === user.email) {
      setStep({ kind: "connected", email: user.email });
      return;
    }
    setStep({ kind: "connecting" });
    try {
      const { token, expiresAt } = await api.connectExtension();
      post({ source: PAGE_SOURCE, type: "token", token, expiresAt });
    } catch (error) {
      setStep({ kind: "failed", message: errorMessage(error) });
    }
  }

  const answer = useEffectEvent((message: ExtensionMessage) => {
    if (message.type === "ready") void connect(message);
    else if (message.type === "connected") setStep({ kind: "connected", email: message.email });
    else setStep({ kind: "failed", message: message.message });
  });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(loginHref(CONNECT_PATH));
      return;
    }
    function onMessage(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const message = readExtensionMessage(event.data);
      if (message) answer(message);
    }
    window.addEventListener("message", onMessage);
    post({ source: PAGE_SOURCE, type: "hello" });
    const timer = window.setTimeout(() => {
      setStep((current) => (current.kind === "looking" ? { kind: "missing" } : current));
    }, LOOK_MS);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timer);
    };
  }, [loading, user, router, attempt]);

  function retry() {
    setStep({ kind: "looking" });
    setAttempt((count) => count + 1);
  }

  const done = step.kind === "connected";
  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <Otto pose={done ? "cheer" : "wave"} size={132} settle lively={!done} />
      <div className="flex flex-col items-center gap-3">
        <h1 className="font-display text-4xl/10 font-normal tracking-tight text-balance text-ink sm:text-5xl/13">
          {done ? words.doneTitle : words.title}
        </h1>
        <p className="max-w-md text-base/7 text-pretty text-muted">
          {done ? words.doneIntro : words.intro}
        </p>
      </div>

      <div aria-live="polite" className="flex w-full flex-col items-center gap-4">
        {loading || step.kind === "looking" ? (
          <LivePill busy>{loading ? words.checkingAccount : words.looking}</LivePill>
        ) : step.kind === "connecting" ? (
          <LivePill busy>{words.connecting}</LivePill>
        ) : step.kind === "connected" ? (
          <ConnectedCard words={words} email={step.email} />
        ) : step.kind === "missing" ? (
          <Alert
            variant="info"
            title={words.missing}
            className="w-full max-w-md text-left"
            action={
              <Button variant="secondary" size="sm" onClick={retry}>
                {words.added}
              </Button>
            }
          >
            {CHROME_STORE_URL ? words.missingStore : words.missingSoon}
          </Alert>
        ) : (
          <Alert
            variant="error"
            title={words.failed}
            className="w-full max-w-md text-left"
            action={
              <Button variant="secondary" size="sm" onClick={retry}>
                {words.tryAgain}
              </Button>
            }
          >
            {step.message}
          </Alert>
        )}
      </div>
    </div>
  );
}

function ConnectedCard({ words, email }: { words: ConnectWords; email: string }) {
  return (
    <div className="flex w-full max-w-md flex-col gap-5 rounded-2xl bg-surface p-5 text-left shadow-card sm:p-6">
      <LivePill className="self-start">{fmt(words.connectedAs, { email })}</LivePill>
      <OttoNote
        size="sm"
        live={false}
        message={fmt(words.tryPost, {
          sites: SITES.slice(0, -1).join(", "),
          last: SITES.at(-1) ?? "",
        })}
      />
      <div className="flex flex-wrap gap-2">
        <Link href={ROUTES.dashboardApplications} className={buttonClasses({ size: "sm" })}>
          {words.board}
          <ArrowRight aria-hidden />
        </Link>
        <Button variant="ghost" size="sm" onClick={() => window.close()}>
          {words.close}
        </Button>
      </div>
    </div>
  );
}
