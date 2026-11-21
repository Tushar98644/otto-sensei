"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { OttoNote } from "@/components/mascot/otto-note";
import { ROUTES } from "@/components/site/routes";
import { Skeleton } from "@/components/ui/skeleton";
import { createSampleResume } from "@/lib/resume/sample";
import { ownResumes } from "@/lib/setup/checklist";
import { useResumeList } from "@/lib/store/resume-store";
import { useFirstLoadPending } from "@/lib/sync/use-cloud-sync";
import { cn } from "@/lib/utils";
import { SkillGapCard } from "./applications/skill-gaps";
import { useApplications } from "./applications/use-applications";
import { WinRatePanel } from "./applications/win-rate-panel";
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
  const applications = useApplications();
  const actions = useStudioActions();
  const [sample] = useState(() => createSampleResume(0));
  const own = useMemo(() => ownResumes(resumes), [resumes]);
  const ownGroups = useMemo(() => groupResumes(own).length, [own]);
  const recent = useMemo(() => recentResumes(resumes, RECENT), [resumes]);
  const samples = resumes.filter((resume) => resume.source === "sample").length;
  const greeting = homeGreeting({ own: loading ? 0 : ownGroups, samples: loading ? 0 : samples });

  const latest = recent[0] ?? null;
  const logged = applications.status === "ready" && applications.items.length > 0;

  return (
    <div className="flex flex-col gap-8 sm:gap-12">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
        <div className="flex min-w-0 flex-col gap-5">
          <h1
            className={cn(
              "font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13",
              loading && "invisible",
            )}
          >
            {greeting.title}
          </h1>
          {loading ? (
            <Skeleton className="h-12 w-80 max-w-full rounded-xl" />
          ) : (
            <OttoNote live={false} meta={greeting.meta} message={greeting.message} />
          )}
        </div>
        <NewResumeMenu actions={actions} className="lg:hidden" />
      </header>

      <UpNext actions={actions} hasSample={samples > 0} />

      <ActionCards actions={actions} latest={latest} pageResume={latest ?? sample} />

      {!loading && own.length > 0 ? <AtAGlance own={own} actions={actions} /> : null}
      {logged ? <WinRatePanel /> : null}
      <SkillGapCard />

      {loading || resumes.length > 0 ? (
        <section aria-labelledby="recent-heading" className="flex flex-col gap-5">
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
                  className="size-4 text-muted transition-transform group-hover:translate-x-0.5"
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
