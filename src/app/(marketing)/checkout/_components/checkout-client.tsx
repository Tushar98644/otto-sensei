"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
import { SUPPORT_MAILTO } from "@/components/account/copy";
import { useOttoLoadingScreen } from "@/components/mascot/otto-loading-screen";
import { ROUTES } from "@/components/site/routes";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { BRAND } from "@/config/brand";
import { PADDLE_JS_URL, type CheckoutTarget } from "./checkout-target";
import { openPaddleCheckout, type PaddleJs } from "./paddle-js";

type Phase = "loading" | "open" | "leaving" | "failed";

// No checkout.loaded in time: a slow or blocked script, a bad token or a blocked frame.
const OPEN_TIMEOUT_MS = 20_000;

export const CHECKOUT_FAILED = "The secure checkout didn't load";
export const CHECKOUT_BLOCKED =
  "A blocker or a dropped connection can stop it loading, so turn off blockers for this page and try again. Still stuck? Email";
export const CHECKOUT_NOT_SET_UP = "Payments aren't working on our side right now. Email";

export function CheckoutClient({
  token,
  target,
}: {
  token: string | null;
  target: CheckoutTarget;
}) {
  const [phase, setPhase] = useState<Phase>(token ? "loading" : "failed");
  useOttoLoadingScreen(
    phase === "loading" || phase === "leaving",
    phase === "leaving" ? "Taking you to your account" : "Opening secure checkout",
  );

  useEffect(() => {
    if (phase !== "loading") return;
    const timer = window.setTimeout(() => setPhase("failed"), OPEN_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  function open() {
    const paddle = (window as Window & { Paddle?: PaddleJs }).Paddle;
    if (!token || !paddle) {
      setPhase("failed");
      return;
    }
    try {
      openPaddleCheckout(paddle, token, target, {
        loaded: () => setPhase((now) => (now === "leaving" ? now : "open")),
        leave: (path) => {
          setPhase("leaving");
          // Replace, so Back from the account page doesn't reopen a finished checkout.
          window.location.replace(path);
        },
      });
    } catch {
      setPhase("failed");
    }
  }

  return (
    <>
      {token ? (
        <Script src={PADDLE_JS_URL} onLoad={open} onError={() => setPhase("failed")} />
      ) : null}
      {phase === "failed" ? (
        <Alert
          variant="error"
          title={CHECKOUT_FAILED}
          action={
            <>
              {token ? (
                <Button variant="secondary" onClick={() => window.location.reload()}>
                  Try again
                </Button>
              ) : null}
              <Link href={ROUTES.account} className={buttonClasses({ variant: "ghost" })}>
                Back to your account
              </Link>
            </>
          }
        >
          Nothing was charged. {token ? CHECKOUT_BLOCKED : CHECKOUT_NOT_SET_UP}{" "}
          <a href={SUPPORT_MAILTO} className="font-medium break-all underline underline-offset-4">
            {BRAND.supportEmail}
          </a>
          {token ? "." : " and we'll sort out your plan."}
        </Alert>
      ) : (
        <p className="max-w-prose text-base/7 text-pretty text-muted">
          Your checkout opens on this page. Paddle, our reseller, takes the payment and handles
          sales tax.
        </p>
      )}
    </>
  );
}
