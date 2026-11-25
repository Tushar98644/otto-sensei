"use client";

import { useRef, useState, type ChangeEvent, type FormEvent, type RefObject } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { track } from "@/lib/analytics/client";
import { api, isApiError } from "@/lib/api/client";
import type { SessionUser } from "@/lib/auth/types";
import { fmt } from "@/i18n/format";
import { rich } from "@/i18n/rich";
import { cn } from "@/lib/utils";
import { errorMessage } from "./errors";
import { GoogleSignIn, googleUnavailable } from "./google-sign-in";
import { SignInTerms, type LegalLinks } from "./sign-in-terms";
import {
  CODE_LENGTH,
  EMAIL_MAX_LENGTH,
  RESEND_COOLDOWN_SECONDS,
  codeDigits,
  looksLikeEmail,
} from "./sign-in-rules";
import { useCooldown } from "./use-cooldown";
import { useSignInWords, type SignInWords } from "./use-sign-in-words";
import { patchMe, refreshMe, useMe } from "./use-me";

type Step = "email" | "code" | "done";
type Pending = "send" | "resend" | "verify";
type ErrorPlacement = "field" | "form";
// A new id per error, so the same message twice in a row is still announced twice.
type FormError = { id: number; message: string; placement: ErrorPlacement };

const LINK_BUTTON =
  "min-h-11 aria-disabled:cursor-default aria-disabled:text-muted aria-disabled:hover:no-underline";

function placementOf(failure: unknown): ErrorPlacement {
  return isApiError(failure, "bad_request") ? "field" : "form";
}

export type SignInFormProps = {
  words?: SignInWords;
  legal?: LegalLinks;
  onSignedIn?: (user: SessionUser) => void;
  onGoogleRedirect?: () => void;
  next?: string;
  initialError?: string;
  autoFocus?: boolean;
  className?: string;
};

export function SignInForm({
  words,
  legal,
  onSignedIn,
  onGoogleRedirect,
  next,
  initialError,
  autoFocus = false,
  className,
}: SignInFormProps) {
  const t = useSignInWords(words);
  // Google is the faster way in, so it takes the forest key; email does only when Google can't work.
  const emailVariant = googleUnavailable(useMe().me?.auth.mode) ? "primary" : "secondary";
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
          ? fmt(t.sent, { length: CODE_LENGTH, email: address })
          : fmt(t.sentNew, { email: address }),
      );
      startResendCooldown();
      if (kind === "send") track("signup_started", { method: "email" });
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
      showError(t.badEmail, emailRef);
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
      showError(fmt(t.badCode, { length: CODE_LENGTH }), codeRef);
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
  const formAlert =
    error?.placement === "form" ? (
      <Alert key={error.id} variant="error">
        {error.message}
      </Alert>
    ) : null;
  const resendLocked = resendIn > 0 || pending !== null;
  const resendLabel =
    pending === "resend"
      ? t.sending
      : resendIn > 0
        ? fmt(t.resendIn, { seconds: resendIn })
        : t.resend;

  return (
    <div className={cn("flex flex-col", className)}>
      {step === "email" ? (
        <form noValidate onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
          <GoogleSignIn
            words={t}
            next={next}
            disabled={pending !== null}
            onError={(message) => showError(message, undefined, "form")}
            onRedirect={onGoogleRedirect}
          />
          <div className="flex items-center gap-3 text-xs text-subtle" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            {t.or}
            <span className="h-px flex-1 bg-border" />
          </div>
          <Field label={t.email} error={fieldError}>
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
              placeholder={t.emailPlaceholder}
              enterKeyHint="send"
              required
              autoFocus={focusEmail}
              data-autofocus
            />
          </Field>
          {formAlert}
          <Button
            type="submit"
            variant={emailVariant}
            loading={pending === "send"}
            className="w-full"
          >
            {t.emailMe}
          </Button>
          <SignInTerms words={t} links={legal} />
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
            {rich(
              sends > 1 ? t.codeSentNew : t.codeSent,
              { b: (chunk) => <span className="font-medium break-all text-ink">{chunk}</span> },
              { length: CODE_LENGTH, email },
            )}
          </p>
          {devCode ? (
            <Alert>
              {rich(
                t.devCode,
                { b: (chunk) => <strong className="font-semibold tabular-nums">{chunk}</strong> },
                { code: devCode },
              )}
            </Alert>
          ) : null}
          <Field
            label={fmt(t.codeLabel, { length: CODE_LENGTH })}
            hint={fmt(t.codeHint, { length: CODE_LENGTH })}
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
            {t.signIn}
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
              {t.otherEmail}
            </Button>
          </div>
        </form>
      ) : null}

      {step === "done" ? <Alert variant="success" title={t.done} /> : null}

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
