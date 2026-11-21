"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
} from "react";
import { useMe } from "@/components/account/use-me";
import type { StepLoader } from "@/components/studio/step-loader";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Resume } from "@/lib/resume/schema";
import { useResumeList, useStudioHydrated } from "@/lib/store/resume-store";
import { PORTFOLIO_ABOUT } from "./lines";
import { makePortfolio, usePortfolio, usePortfolioStore } from "./portfolio-store";
import { PORTFOLIO_ROUTE } from "./route";
import { editorLoader, startLoader, upgradeLoader } from "./screens";
import { preloadTemplate } from "./templates/lazy";

// Fetched as soon as the plan says which screen it is, so the download overlaps the portfolio's.
function useLoaded<P extends object>(loader: StepLoader<ComponentType<P>>, wanted: boolean) {
  const state = useSyncExternalStore(loader.subscribe, loader.getState, loader.getState);
  const [failure, setFailure] = useState<{ error: unknown } | null>(null);

  useEffect(() => {
    if (!wanted || loader.getState().status === "ready") return;
    let live = true;
    loader.load().catch((error: unknown) => {
      if (live) setFailure({ error });
    });
    return () => {
      live = false;
    };
  }, [loader, wanted]);

  return { Component: state.status === "ready" ? state.value : null, failure };
}

export function portfolioCandidates(resumes: readonly Resume[]): Resume[] {
  return [...resumes].sort(
    (a, b) => Number(a.tailor !== null) - Number(b.tailor !== null) || b.updatedAt - a.updatedAt,
  );
}

function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13">
          Portfolio
        </h1>
        <p className="mt-3 max-w-prose text-base/7 text-pretty text-muted">{PORTFOLIO_ABOUT}</p>
      </header>
      {children}
    </div>
  );
}

function Loading() {
  return (
    <div className="grid gap-6 lg:grid-cols-5" aria-busy>
      <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
      <Skeleton className="h-96 rounded-2xl lg:col-span-3" />
    </div>
  );
}

export type PortfolioPageProps = {
  fromResumeId: string | null;
};

export function PortfolioPage({ fromResumeId }: PortfolioPageProps) {
  const router = useRouter();
  const { user } = useMe();
  const userId = user?.id ?? null;
  const locked = user !== null && user.plan === "free";
  const hydrated = useStudioHydrated();
  const resumes = useResumeList();
  const candidates = useMemo(() => portfolioCandidates(resumes), [resumes]);
  const { status, error, portfolio, retry } = usePortfolio();
  const saving = usePortfolioStore((state) => state.saving);
  const handled = useRef(false);
  const editor = useLoaded(editorLoader, userId !== null && !locked);
  const upgrade = useLoaded(upgradeLoader, locked);
  const start = useLoaded(
    startLoader,
    userId !== null && !locked && !(status === "ready" && portfolio !== null),
  );
  const template = portfolio?.template ?? null;

  const ready = hydrated && userId !== null && status === "ready";
  const from = fromResumeId ? (resumes.find((resume) => resume.id === fromResumeId) ?? null) : null;

  useEffect(() => {
    if (template && !locked) preloadTemplate(template);
  }, [template, locked]);

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
            <Button size="sm" variant="secondary" onClick={retry}>
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
        <Loading />
      </Screen>
    );
  }
  if (locked) {
    if (upgrade.failure) throw upgrade.failure.error;
    const Upgrade = upgrade.Component;
    return (
      <Screen>
        {Upgrade ? <Upgrade portfolio={portfolio} candidates={candidates} /> : <Loading />}
      </Screen>
    );
  }
  if (!portfolio) {
    if (start.failure) throw start.failure.error;
    const Start = start.Component;
    return <Screen>{Start ? <Start candidates={candidates} /> : <Loading />}</Screen>;
  }
  if (editor.failure) throw editor.failure.error;
  const Editor = editor.Component;
  if (!Editor) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }
  return (
    <Editor
      portfolio={portfolio}
      resumes={candidates}
      offer={from && from.id !== portfolio.resumeId ? from : null}
      onOfferDone={() => router.replace(PORTFOLIO_ROUTE, { scroll: false })}
    />
  );
}
