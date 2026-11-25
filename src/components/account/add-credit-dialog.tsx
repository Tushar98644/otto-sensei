"use client";

import { CreditCard } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { OttoNote } from "@/components/mascot/otto-note";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { isTopupAmount, TOPUP_LIMITS } from "@/config/topup";
import { useFormat, useMessages } from "@/i18n/client";
import type { Messages } from "@/i18n/messages";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { errorMessage } from "./errors";
import { buysIn, centsIn, usdIn } from "./local-prices";
import { returnPathHere } from "./upgrade-return";
import { refreshMe, useMe } from "./use-me";

export type AddCreditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Where to come back once paid; without it, the page the dialog opened on.
  next?: string | null;
};

type Choice = number | "other";

const { minUsd, maxUsd, maxBalanceUsd, presetsUsd } = TOPUP_LIMITS;
const DEFAULT_CHOICE: Choice = presetsUsd[1] ?? minUsd;

type CreditWords = Messages["upgrade"]["credit"];

function amountError(t: CreditWords, format: Format, usd: number, roomUsd: number): string | null {
  const dollars = (amount: number) => usdIn(format, amount);
  if (!isTopupAmount(usd)) return fmt(t.pick, { min: dollars(minUsd), max: dollars(maxUsd) });
  if (usd > roomUsd) {
    return roomUsd >= minUsd
      ? fmt(t.room, { cap: dollars(maxBalanceUsd), room: dollars(roomUsd) })
      : fmt(t.full, { cap: dollars(maxBalanceUsd) });
  }
  return null;
}

export function AddCreditDialog({ open, onOpenChange, next }: AddCreditDialogProps) {
  const { me } = useMe();
  const words = useMessages("upgrade");
  const t = words.credit;
  const format = useFormat();
  const dollars = (amount: number) => usdIn(format, amount);
  const name = useId();
  const [choice, setChoice] = useState<Choice>(DEFAULT_CHOICE);
  const [other, setOther] = useState("");
  const [pending, setPending] = useState(false);

  // Back from checkout can restore this page from bfcache with the button still spinning.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const credit = me?.billing.credit;
  const balance = credit?.balanceCents ?? 0;
  const roomUsd = Math.floor((maxBalanceUsd * 100 - balance) / 100);
  const usd = choice === "other" ? Number(other.trim() || Number.NaN) : choice;
  const typing = choice === "other" && other.trim() === "";
  const error = typing ? null : amountError(t, format, usd, roomUsd);
  const ready = !typing && error === null;
  const mock = me?.billing.mode === "mock";

  async function add() {
    if (!ready) return;
    setPending(true);
    try {
      const { url } = await api.topup({ usd, ...withNext(next ?? returnPathHere()) });
      window.location.assign(url);
    } catch (failure) {
      setPending(false);
      toast({ title: t.failed, description: errorMessage(failure), variant: "error" });
      void refreshMe();
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={t.title}
      description={t.description}
      illustration={<OttoNote size="sm" message={`${buysIn(t, format, 1)}.`} />}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {words.buttons.notNow}
          </Button>
          <Button onClick={() => void add()} loading={pending} disabled={!ready} data-autofocus>
            <CreditCard />
            {ready ? fmt(t.add, { amount: dollars(usd) }) : t.title}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium text-ink">{t.amount}</legend>
          <div className="flex gap-1 rounded-xl bg-surface-muted p-1">
            {[...presetsUsd, "other" as const].map((option) => (
              <label key={option} className="relative min-w-0 flex-1">
                <input
                  type="radio"
                  name={name}
                  value={option}
                  checked={choice === option}
                  onChange={() => setChoice(option)}
                  className="peer sr-only"
                />
                <span className="flex h-11 cursor-pointer items-center justify-center rounded-lg px-3 text-sm font-medium text-muted tabular-nums transition-colors peer-checked:bg-surface peer-checked:text-ink peer-checked:shadow-control peer-checked:ring-1 peer-checked:ring-ink/5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink hover:text-ink">
                  {option === "other" ? t.other : dollars(option)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {choice === "other" ? (
          <Field
            label={t.amountLabel}
            hint={fmt(t.hint, { min: dollars(minUsd), max: dollars(maxUsd) })}
            error={error ?? undefined}
          >
            <Input
              inputMode="numeric"
              autoComplete="off"
              placeholder={String(minUsd)}
              value={other}
              onChange={(event) => setOther(event.target.value.replace(/[^\d]/g, "").slice(0, 3))}
              onKeyDown={(event) => {
                if (event.key === "Enter") void add();
              }}
            />
          </Field>
        ) : error ? (
          <p className="text-sm/6 text-fail">{error}</p>
        ) : null}
        <p aria-live="polite" className={cn("text-sm/6 text-muted", !ready && "invisible")}>
          {ready ? `${buysIn(t, format, usd)}.` : buysIn(t, format, minUsd)}
        </p>
        {balance > 0 ? (
          <p className="text-sm/6 text-muted">
            {fmt(t.balanceNow, { balance: centsIn(format, balance) })}
          </p>
        ) : null}
        {mock ? (
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <Badge>{words.billing.testMode}</Badge>
            {t.mock}
          </p>
        ) : (
          <p className="text-sm/6 text-subtle">{t.tax}</p>
        )}
      </div>
    </Dialog>
  );
}

function withNext(next: string | null): { next?: string } {
  return next ? { next } : {};
}
