"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type RefObject,
} from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, isApiError } from "@/lib/api/client";
import type { SessionUser } from "@/lib/auth/types";
import { cn } from "@/lib/utils";
import { errorMessage } from "./errors";
import { GoogleSignIn } from "./google-sign-in";
import { SignInTerms } from "./sign-in-terms";
import {
  CODE_LENGTH,
  EMAIL_MAX_LENGTH,
  RESEND_COOLDOWN_SECONDS,
  codeDigits,
  looksLikeEmail,
} from "./sign-in-rules";
import { useCooldown } from "./use-cooldown";
import { patchMe, refreshMe } from "./use-me";

type Step = "email" | "code" | "done";
type Pending = "send" | "resend" | "verify";
// "field" errors are about what was typed and sit under the input. "form" errors are about the
// service (email not set up, provider down, too many tries), so they get their own alert instead
// of marking a correct address as invalid.
type ErrorPlacement = "field" | "form";
// A new id per error, so the same message twice in a row is still announced twice.
type FormError = { id: number; message: string; placement: ErrorPlacement };

// Link-styled buttons keep the 44px touch target, and stay focusable while unavailable.
const LINK_BUTTON =
  "min-h-11 aria-disabled:cursor-default aria-disabled:text-muted aria-disabled:hover:no-underline";

// The API answers bad_request only for the address or code itself.
function placementOf(failure: unknown): ErrorPlacement {
  return isApiError(failure, "bad_request") ? "field" : "form";
}

export type SignInFormProps = {
  // Runs once the session cookies are set and useMe() has the user. Not after Google: that sign-in
  // leaves the page and comes back to `next` instead.
  onSignedIn?: (user: SessionUser) => void;
  // Where Google sign-in returns to. Defaults to the current page.
  next?: string;
  // Shown as a form alert on arrival, e.g. a Google sign-in that didn't finish.
  initialError?: string;
  // Focuses the email field on mount. A Dialog doesn't need it: it focuses [data-autofocus].
  autoFocus?: boolean;
  className?: string;
};

// Google, or email then a 6-digit code. Anyone signing in for the first time gets a free account.
export function SignInForm({
  onSignedIn,
  next,
  initialError,
  autoFocus = false,
  className,
}: SignInFormProps) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string>();
  const [sends, setSends] = useState(0);
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<FormError | null>(
    initialError ? { id: 1, message: initialError, placement: "form" } : null,
  );
  const [status, setStatus] = useState("");
  const [focusEmail, setFocusEmail] = useState(autoFocus);
  const [resendIn, startResendCooldown] = useCooldown(RESEND_COOLDOWN_SECONDS);
  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  // Typing the last digit and pressing Enter can both submit before React re-renders.
  const busy = useRef(false);

  function showError(
    message: string,
    field?: RefObject<HTMLInputElement | null>,
    placement: ErrorPlacement = "field",
  ) {
    setError((previous) => ({ id: (previous?.id ?? 0) + 1, message, placement }));
    field?.current?.focus();
  }

  async function run(kind: Pending, task: () => Promise<void>) {
    busy.current = true;
    setPending(kind);
    setError(null);
    try {
      await task();
    } finally {
      busy.current = false;
      setPending(null);
    }
  }

  async function sendCode(address: string, kind: "send" | "resend") {
    try {
      const response = await api.requestCode(address);
      setEmail(address);
      setCode("");
      setDevCode(response.devCode);
      setSends((count) => count + 1);
      setStep("code");
      setStatus(
        kind === "send"
          ? `We sent a ${CODE_LENGTH}-digit code to ${address}.`
          : `We sent a new code to ${address}.`,
      );
      startResendCooldown();
      if (kind === "resend") codeRef.current?.focus();
    } catch (failure) {
      const field = kind === "send" ? emailRef : undefined;
      showError(errorMessage(failure), field, placementOf(failure));
    }
  }

  function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const address = email.trim();
    if (!looksLikeEmail(address)) {
      showError("Enter your email address, like name@example.com.", emailRef);
      return;
    }
    void run("send", () => sendCode(address, "send"));
  }

  function handleResend() {
    if (busy.current || resendIn > 0) return;
    void run("resend", () => sendCode(email, "resend"));
  }

  function verify(value: string) {
    if (busy.current) return;
    if (value.length !== CODE_LENGTH) {
      showError(`Enter the ${CODE_LENGTH}-digit code from the email.`, codeRef);
      return;
    }
    void run("verify", async () => {
      let user: SessionUser;
      try {
        ({ user } = await api.verifyCode(email, value));
      } catch (failure) {
        showError(errorMessage(failure), codeRef, placementOf(failure));
        codeRef.current?.select();
        return;
      }
      // The page reacts at once; the refresh then brings this account's usage and billing.
      patchMe({ user });
      await refreshMe();
      setStep("done");
      onSignedIn?.(user);
    });
  }

  function handleCodeChange(event: ChangeEvent<HTMLInputElement>) {
    const next = codeDigits(event.currentTarget.value);
    if (next === code) return;
    setCode(next);
    setError(null);
    // A pasted or autofilled code signs in straight away, as the field's hint says.
    if (next.length === CODE_LENGTH) verify(next);
  }

  function changeEmail() {
    setStep("email");
    setCode("");
    setDevCode(undefined);
    setSends(0);
    setError(null);
    setStatus("");
    setFocusEmail(true);
  }

  const fieldError = error?.placement === "field" ? error.message : undefined;
  // Keyed by id so a repeated failure remounts the alert and is announced again.
  const formAlert =
    error?.placement === "form" ? (
      <Alert key={error.id} variant="error">
        {error.message}
      </Alert>
    ) : null;
  const resendLocked = resendIn > 0 || pending !== null;
  const resendLabel =
    pending === "resend"
      ? "Sending…"
      : resendIn > 0
        ? `Resend code in ${resendIn}s`
        : "Resend code";

  return (
    <div className={cn("flex flex-col", className)}>
      {step === "email" ? (
        <form noValidate onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
          <GoogleSignIn
            next={next}
            disabled={pending !== null}
            onError={(message) => showError(message, undefined, "form")}
          />
          <div className="flex items-center gap-3 text-xs text-subtle" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          <Field label="Email" error={fieldError}>
            <Input
              ref={emailRef}
              type="email"
              name="email"
              value={email}
              onChange={(event) => {
                setEmail(event.currentTarget.value);
                setError(null);
              }}
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={EMAIL_MAX_LENGTH}
              placeholder="you@example.com"
              enterKeyHint="send"
              required
              autoFocus={focusEmail}
              data-autofocus
            />
          </Field>
          {formAlert}
          <Button type="submit" loading={pending === "send"} className="w-full">
            Email me a code
          </Button>
          <SignInTerms />
        </form>
      ) : null}

      {step === "code" ? (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            verify(code);
          }}
          className="flex flex-col gap-4"
        >
          <p className="text-sm text-muted">
            {sends > 1 ? "We sent a new code to " : `We sent a ${CODE_LENGTH}-digit code to `}
            <span className="font-medium break-all text-ink">{email}</span>.
            {sends > 1 ? " Only the newest one works." : null}
          </p>
          {devCode ? (
            <Alert>
              Dev mode: your code is <strong className="font-semibold tabular-nums">{devCode}</strong>
            </Alert>
          ) : null}
          <Field
            label={`${CODE_LENGTH}-digit code`}
            hint={`Type or paste it. You're signed in as soon as all ${CODE_LENGTH} digits are in.`}
            error={fieldError}
          >
            <Input
              ref={codeRef}
              name="code"
              value={code}
              onChange={handleCodeChange}
              inputMode="numeric"
              autoComplete="one-time-code"
              enterKeyHint="go"
              spellCheck={false}
              autoFocus
              className="text-center text-lg font-medium tracking-widest tabular-nums sm:text-lg"
            />
          </Field>
          {formAlert}
          <Button type="submit" loading={pending === "verify"} className="w-full">
            Sign in
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-x-4">
            <Button
              variant="link"
              onClick={handleResend}
              aria-disabled={resendLocked || undefined}
              className={LINK_BUTTON}
            >
              {resendLabel}
            </Button>
            <Button variant="link" onClick={changeEmail} className={LINK_BUTTON}>
              Use a different email
            </Button>
          </div>
        </form>
      ) : null}

      {step === "done" ? <Alert variant="success" title="You're signed in." /> : null}

      <p role="status" className="sr-only">
        {status}
      </p>
      {error?.placement === "field" ? (
        <p key={error.id} role="alert" className="sr-only">
          {error.message}
        </p>
      ) : null}
    </div>
  );
}

