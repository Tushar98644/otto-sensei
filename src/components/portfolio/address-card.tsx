"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/client";
import { normalizeSlug, SLUG_MAX, SLUG_MESSAGES, slugProblem } from "@/lib/portfolio/slug";
import { PORTFOLIO_LIMITS, type Portfolio } from "@/lib/portfolio/types";
import { EditorSection } from "./check-row";
import { messageOf, savePortfolio, usePortfolioStore } from "./portfolio-store";

const CHECK_DELAY_MS = 400;

type Check = { slug: string; available: boolean; message: string | null } | null;

export function AddressCard({ portfolio }: { portfolio: Portfolio }) {
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
            live && setCheck({ slug, available: false, message: messageOf(error) }),
        );
    }, CHECK_DELAY_MS);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [changed, problem, slug]);

  const current = check?.slug === slug ? check : null;
  const note = !changed
    ? portfolio.publishedAt !== null
      ? `Changing it keeps the old address working for ${PORTFOLIO_LIMITS.redirectDays} days.`
      : "Lowercase letters, numbers and hyphens."
    : problem
      ? SLUG_MESSAGES[problem]
      : current
        ? (current.message ?? `/p/${slug} is free.`)
        : "Checking…";
  const canSave = changed && !problem && current?.available === true && !saving;

  async function save() {
    if (await savePortfolio({ slug })) {
      setDraft(null);
      setCheck(null);
    }
  }

  return (
    <EditorSection title="Address">
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave) void save();
        }}
      >
        <Label htmlFor={inputId}>Your page lives at /p/</Label>
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
              Save
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
