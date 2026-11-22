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
import { api } from "@/lib/api/client";
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

// The bridge script loads with the page, but may answer a moment after it.
const LOOK_MS = 2_500;
const SITES = ["LinkedIn", "Naukri", "Indeed", "Greenhouse", "Lever", "Ashby", "Workday"];

function post(message: PageMessage) {
  window.postMessage(message, window.location.origin);
}

export function ConnectPage() {
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
          {done ? "Otto is on your job hunt" : "Connect Otto for Chrome"}
        </h1>
        <p className="max-w-md text-base/7 text-pretty text-muted">
          {done
            ? "Open any job post. Otto's badge shows how your resume matches, and whether you can take the job, before you read a word."
            : "One tap links the extension to your account, so the badge can check posts against your resume."}
        </p>
      </div>

      <div aria-live="polite" className="flex w-full flex-col items-center gap-4">
        {loading || step.kind === "looking" ? (
          <LivePill busy>
            {loading ? "Checking your account" : "Looking for the extension"}
          </LivePill>
        ) : step.kind === "connecting" ? (
          <LivePill busy>Connecting</LivePill>
        ) : step.kind === "connected" ? (
          <ConnectedCard email={step.email} />
        ) : step.kind === "missing" ? (
          <Alert
            variant="info"
            title="Otto for Chrome isn't in this browser yet"
            className="w-full max-w-md text-left"
            action={
              <Button variant="secondary" size="sm" onClick={retry}>
                I&apos;ve added it
              </Button>
            }
          >
            Add the extension to Chrome, then come back to this tab. If you just added it, reload
            this page.
          </Alert>
        ) : (
          <Alert
            variant="error"
            title="That didn't connect"
            className="w-full max-w-md text-left"
            action={
              <Button variant="secondary" size="sm" onClick={retry}>
                Try again
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

function ConnectedCard({ email }: { email: string }) {
  return (
    <div className="flex w-full max-w-md flex-col gap-5 rounded-2xl bg-surface p-5 text-left shadow-card sm:p-6">
      <LivePill className="self-start">Connected as {email}</LivePill>
      <OttoNote
        size="sm"
        live={false}
        message={`Try a post on ${SITES.slice(0, -1).join(", ")} or ${SITES.at(-1)}. On any other site, press my button in the toolbar.`}
      />
      <div className="flex flex-wrap gap-2">
        <Link href={ROUTES.dashboardApplications} className={buttonClasses({ size: "sm" })}>
          Open your board
          <ArrowRight aria-hidden />
        </Link>
        <Button variant="ghost" size="sm" onClick={() => window.close()}>
          Close this tab
        </Button>
      </div>
    </div>
  );
}
