"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useMe } from "@/components/account/use-me";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Resume } from "@/lib/resume/schema";
import { useResumeList, useStudioHydrated } from "@/lib/store/resume-store";
import { PortfolioEditor } from "./portfolio-editor";
import { PortfolioStart } from "./portfolio-start";
import { PortfolioUpgrade } from "./portfolio-upgrade";
import { makePortfolio, usePortfolioStore } from "./portfolio-store";
import { PORTFOLIO_ROUTE } from "./route";

// Base resumes first, newest first: a tailored copy is for one job, a portfolio is for everyone.
export function portfolioCandidates(resumes: readonly Resume[]): Resume[] {
  return [...resumes].sort(
    (a, b) => Number(a.tailor !== null) - Number(b.tailor !== null) || b.updatedAt - a.updatedAt,
  );
}

// The screen's title before there's an editor (loading, the first run, the Free pitch). The editor
// draws its own, smaller one in its top bar.
function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13">
          Portfolio
        </h1>
        <p className="mt-3 max-w-prose text-base/7 text-pretty text-muted">
          Your resume as a personal web page, with your projects up front.
        </p>
      </header>
      {children}
    </div>
  );
}

export type PortfolioPageProps = {
  // From a resume card's "Make my portfolio": make it from this one without another click.
  fromResumeId: string | null;
};

export function PortfolioPage({ fromResumeId }: PortfolioPageProps) {
  const router = useRouter();
  const { user } = useMe();
  const userId = user?.id ?? null;
  // Portfolios are Pro and Max (a trial included). Free keeps the data, offline.
  const locked = user !== null && user.plan === "free";
  const hydrated = useStudioHydrated();
  const resumes = useResumeList();
  const candidates = useMemo(() => portfolioCandidates(resumes), [resumes]);
  const status = usePortfolioStore((state) => state.status);
  const owner = usePortfolioStore((state) => state.owner);
  const error = usePortfolioStore((state) => state.error);
  const portfolio = usePortfolioStore((state) => state.portfolio);
  const saving = usePortfolioStore((state) => state.saving);
  const handled = useRef(false);

  useEffect(() => {
    if (userId) void usePortfolioStore.getState().load(userId);
  }, [userId]);

  const ready = hydrated && userId !== null && owner === userId && status === "ready";
  const from = fromResumeId ? (resumes.find((resume) => resume.id === fromResumeId) ?? null) : null;

  // One click from a card: with no portfolio yet, make it from that resume as the page opens.
  // Pointing an existing one at another resume waits for the editor's own button.
  useEffect(() => {
    if (!ready || handled.current || !fromResumeId || locked) return;
    handled.current = true;
    if (!portfolio && from) void makePortfolio(from);
    const offered = portfolio !== null && from !== null && from.id !== portfolio.resumeId;
    if (!offered) router.replace(PORTFOLIO_ROUTE, { scroll: false });
  }, [ready, fromResumeId, from, portfolio, router, locked]);

  if (status === "error") {
    return (
      <Screen>
        <Alert
          variant="error"
          title="Couldn't load your portfolio"
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                userId && void usePortfolioStore.getState().load(userId, { force: true })
              }
            >
              Try again
            </Button>
          }
        >
          {error ?? "Check your connection, then try again."}
        </Alert>
      </Screen>
    );
  }
  if (!ready || (saving && !portfolio)) {
    return (
      <Screen>
        <div className="grid gap-6 lg:grid-cols-5" aria-busy>
          <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-96 rounded-2xl lg:col-span-3" />
        </div>
      </Screen>
    );
  }
  if (locked) {
    return (
      <Screen>
        <PortfolioUpgrade portfolio={portfolio} candidates={candidates} />
      </Screen>
    );
  }
  if (!portfolio) {
    return (
      <Screen>
        <PortfolioStart candidates={candidates} />
      </Screen>
    );
  }
  return (
    <PortfolioEditor
      portfolio={portfolio}
      resumes={candidates}
      offer={from && from.id !== portfolio.resumeId ? from : null}
      onOfferDone={() => router.replace(PORTFOLIO_ROUTE, { scroll: false })}
    />
  );
}
