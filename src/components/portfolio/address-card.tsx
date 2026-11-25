"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { api } from "@/lib/api/client";
import { normalizeSlug, SLUG_MAX, SLUG_MIN, slugProblem } from "@/lib/portfolio/slug";
import { PORTFOLIO_LIMITS, type Portfolio } from "@/lib/portfolio/types";
import { EditorSection } from "./check-row";
import { messageOf, savePortfolio, usePortfolioStore } from "./portfolio-store";

const CHECK_DELAY_MS = 400;

type Check = { slug: string; available: boolean; message: string | null } | null;

export function AddressCard({ portfolio }: { portfolio: Portfolio }) {
  const words = useMessages("portfolio");
  const address = words.address;
  const inputId = useId();
  const noteId = useId();
  const saving = usePortfolioStore((state) => state.saving);
  const [draft, setDraft] = useState<string | null>(null);
  const [check, setCheck] = useState<Check>(null);
  const value = draft ?? portfolio.slug;
  const slug = normalizeSlug(value);
  const changed = draft !== null && slug !== portfolio.slug;
  const problem = changed ? slugProblem(slug) : null;

  useEffect(() => {
    if (!changed || problem) return;
    let live = true;
    const timer = window.setTimeout(() => {
      api
        .checkPortfolioSlug(slug)
        .then((answer) => live && setCheck(answer))
        .catch(
          (error: unknown) =>
            live &&
            setCheck({ slug, available: false, message: messageOf(error, words.store.failed) }),
        );
    }, CHECK_DELAY_MS);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [changed, problem, slug, words.store.failed]);

  const current = check?.slug === slug ? check : null;
  const note = !changed
    ? portfolio.publishedAt !== null
      ? fmt(address.keepsOld, { days: PORTFOLIO_LIMITS.redirectDays })
      : address.rules
    : problem
      ? fmt(address.problems[problem], { min: SLUG_MIN, max: SLUG_MAX })
      : current
        ? (current.message ?? fmt(address.free, { slug }))
        : address.checking;
  const canSave = changed && !problem && current?.available === true && !saving;

  async function save() {
    if (await savePortfolio({ slug }, words.store)) {
      setDraft(null);
      setCheck(null);
    }
  }

  return (
    <EditorSection title={address.title}>
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave) void save();
        }}
      >
        <Label htmlFor={inputId}>{address.livesAt}</Label>
        <div className="flex gap-2">
          <Input
            id={inputId}
            value={value}
            maxLength={SLUG_MAX + 20}
            autoComplete="off"
            spellCheck={false}
            invalid={Boolean(problem) || current?.available === false}
            aria-describedby={noteId}
            onChange={(event) => setDraft(event.currentTarget.value)}
            className="font-mono"
          />
          {changed ? (
            <Button type="submit" variant="secondary" disabled={!canSave}>
              {address.save}
            </Button>
          ) : null}
        </div>
        <p id={noteId} aria-live="polite" className="text-sm/5 text-subtle">
          {note}
        </p>
      </form>
    </EditorSection>
  );
}
