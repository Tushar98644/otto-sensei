"use client";

import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { OttoMark } from "@/components/site/otto-mark";
import { ROUTES } from "@/components/site/routes";
import { buttonClasses } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ownResumes } from "@/lib/setup/checklist";
import { useResumeList } from "@/lib/store/resume-store";
import { useFirstLoadPending } from "@/lib/sync/use-cloud-sync";
import { cn } from "@/lib/utils";
import { SkillGapCard } from "./applications/skill-gaps";
import { groupResumes } from "./group-resumes";
import { ActionCards } from "./home/action-cards";
import { AtAGlance } from "./home/glance";
import { homeGreeting } from "./home/greeting";
import { UpNext } from "./home/up-next";
import { recentResumes } from "./library";
import { NewResumeMenu } from "./new-resume-menu";
import { ResumeGrid } from "./resume-grid";
import { useStudioActions } from "./use-studio-actions";

const RECENT = 3;
const count = new Intl.NumberFormat("en-US");

export function DashboardHome() {
  const loading = useFirstLoadPending();
  const resumes = useResumeList();
  const actions = useStudioActions();
  const own = useMemo(() => ownResumes(resumes), [resumes]);
  const ownGroups = useMemo(() => groupResumes(own).length, [own]);
  const recent = useMemo(() => recentResumes(resumes, RECENT), [resumes]);
  const samples = resumes.filter((resume) => resume.source === "sample").length;
  const greeting = homeGreeting({ own: loading ? 0 : ownGroups, samples: loading ? 0 : samples });

  return (
    <div className="flex flex-col gap-8 sm:gap-12">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h1
            className={cn(
              "font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13",
              loading && "invisible",
            )}
          >
            {greeting.title}
          </h1>
          {/* From lg the sidebar holds New resume; Up next keeps the page's one primary key. */}
          <NewResumeMenu
            actions={actions}
            align="end"
            triggerClassName={buttonClasses({ variant: "secondary", size: "sm", className: "lg:hidden" })}
            trigger={
              <>
                <Plus aria-hidden />
                New resume
              </>
            }
          />
        </div>
        {loading ? (
          <Skeleton className="h-7 w-96 max-w-full rounded-lg" />
        ) : (
          <p className="flex items-start gap-2.5 text-base/7 text-pretty text-muted">
            <span
              aria-hidden
              className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface ring-1 ring-border"
            >
              <OttoMark className="size-4.5" />
            </span>
            {greeting.message}
          </p>
        )}
      </header>

      <UpNext actions={actions} hasSample={samples > 0} />

      <ActionCards actions={actions} latest={recent[0] ?? null} />

      {!loading && own.length > 0 ? <AtAGlance /> : null}
      <SkillGapCard />

      {loading || resumes.length > 0 ? (
        <section aria-labelledby="recent-heading" className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="recent-heading" className="font-sans text-lg/7 font-medium text-ink">
              Recent resumes
            </h2>
            {resumes.length > RECENT ? (
              <Link
                href={ROUTES.dashboardResumes}
                className="group inline-flex items-center gap-1 text-sm font-medium text-ink"
              >
                View all {count.format(resumes.length)}
                <ArrowRight
                  aria-hidden
                  className="size-4 text-muted transition-transform duration-150 ease-out group-hover:translate-x-0.5"
                />
              </Link>
            ) : null}
          </div>
          {loading ? (
            <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-80 rounded-2xl bg-surface" />
              ))}
            </div>
          ) : (
            <ResumeGrid resumes={recent} all={resumes} actions={actions} cheer={false} />
          )}
        </section>
      ) : null}

    </div>
  );
}
