"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  Copy,
  CornerDownRight,
  Download,
  Ellipsis,
  FileBraces,
  FileText,
  FolderGit,
  Globe,
  Layers,
  Link2,
  MessagesSquare,
  PenLine,
  Settings2,
  Target,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { useProTools } from "@/components/account/pro-tools";
import { openFeaturePrompt, openUpgradePrompt } from "@/components/account/upgrade-prompt";
import { useGitHubReturn } from "@/components/github/connect-return";
import { OttoCheer } from "@/components/mascot/otto-cheer";
import { portfolioFrom } from "@/components/portfolio/route";
import { useShareResume } from "@/components/share/use-share-resume";
import { ROUTES } from "@/components/site/routes";
import { formatRelativeTime } from "@/components/studio/relative-time";
import { Button, buttonClasses } from "@/components/ui/button";
import { FolderCard } from "@/components/ui/folder-card";
import { Menu } from "@/components/ui/menu";
import { toast } from "@/components/ui/toast";
import { downloadJsonResume } from "@/lib/jsonresume/download";
import { lintResume } from "@/lib/lint/bullets";
import { TEMPLATE_INFO, templateOf } from "@/lib/pdf/templates";
import { resumeTitle, titleKey } from "@/lib/resume/ops";
import { copyLetter } from "@/lib/applications/thread";
import type { Resume } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";
import { cn, pluralize } from "@/lib/utils";
import { MarkApplied, useCopyApplication, useJustApplied } from "./applications/mark-applied";
import { cardId, SOURCE_TABS, tailoredJob } from "./library";
import { CardChips, type CardChip } from "./library/card-chips";
import { PaperWell } from "./library/paper-well";
import { linesChip, reportChip } from "./resume-status";
import type { StudioActions } from "./use-studio-actions";
import { useTailorLocked } from "./use-tailor-locked";

type GitHubDialog = typeof import("@/components/github/github-import-dialog").GitHubImportDialog;

export type ResumeCardProps = {
  resume: Resume;
  base: Resume | null;
  copies: number;
  now: number;
  actions: StudioActions;
  onRename: (resume: Resume) => void;
  onDuplicate: (resume: Resume) => void;
  onDelete: (resume: Resume) => void;
  onShowBase?: (id: string) => void;
  cheer?: boolean;
};

function defaultTailoredTitle(resume: Resume): string {
  const tailor = resume.tailor;
  if (!tailor) return "";
  return [tailor.jobTitle || "Tailored", tailor.company].filter(Boolean).join(" at ");
}

// The person's name, when the title doesn't already say it.
function personLine(resume: Resume, title: string): string | null {
  const name = resume.basics.name.trim();
  if (!name) return null;
  return titleKey(name) === titleKey(title) ? null : name;
}

const fullDate = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

function editedAt(timestamp: number): { dateTime?: string; title?: string } {
  if (!Number.isFinite(timestamp)) return {};
  return { dateTime: new Date(timestamp).toISOString(), title: fullDate.format(timestamp) };
}

export function ResumeCard({
  resume,
  base,
  copies,
  now,
  actions,
  onRename,
  onDuplicate,
  onDelete,
  onShowBase,
  cheer = true,
}: ResumeCardProps) {
  const titleId = useId();
  const justApplied = useJustApplied(resume.id);
  // Stays mounted after first use, so closing it hands focus back to the menu.
  const [github, setGithub] = useState({ used: false, open: false });
  // Not Suspense: React's 300 ms fallback throttle would hold the dialog back.
  const [GitHubImportDialog, setGitHubImportDialog] = useState<GitHubDialog | null>(null);

  function openGitHub() {
    setGithub({ used: true, open: true });
    if (GitHubImportDialog) return;
    import("@/components/github/github-import-dialog").then(
      (module) => setGitHubImportDialog(() => module.GitHubImportDialog),
      () => {
        setGithub({ used: false, open: false });
        toast({
          title: "Couldn't open GitHub import",
          description: "Try again in a moment.",
          variant: "error",
        });
      },
    );
  }
  useGitHubReturn(resume.id, openGitHub);
  // Free only, never while the plan loads: each locked action opens the trial before any work.
  const locked = useProTools() === false;
  const tailorLocked = useTailorLocked();
  const share = useShareResume(resume);
  const router = useRouter();
  const report = useStudioStore((s) => s.reports[resume.id]);
  const lint = useMemo(() => lintResume(resume), [resume]);
  const title = resumeTitle(resume);
  const tailored = resume.tailor !== null;
  const job = tailoredJob(resume);
  const showJob = job !== null && resume.title.trim() !== defaultTailoredTitle(resume);
  const format = TEMPLATE_INFO[templateOf(resume)].name;
  const person = personLine(resume, title);
  const sentWith = useCopyApplication(resume);
  const chips: CardChip[] = [
    ...[reportChip(report), linesChip(lint)]
      .filter((chip) => chip !== null)
      .map((chip) => ({ label: chip.label, tone: chip.status })),
    ...(copies > 0
      ? [
          {
            label: pluralize(copies, "tailored copy", "tailored copies"),
            tone: "neutral" as const,
            icon: Layers,
          },
        ]
      : []),
    ...(copyLetter(resume)
      ? [{ label: "Cover letter", tone: "neutral" as const, icon: FileText }]
      : []),
    ...(sentWith?.hasPrep
      ? [{ label: "Interview prep", tone: "neutral" as const, icon: MessagesSquare }]
      : []),
  ];
  const open = () => actions.open(resume.id, "fix");

  return (
    <article aria-labelledby={titleId} className="group/card h-full">
      <FolderCard
        tab={SOURCE_TABS[resume.source]}
        tone={tailored ? "lavender" : "plain"}
        className="h-full"
        bodyClassName="flex flex-col p-2"
      >
        <PaperWell resume={resume} onOpen={open}>
          {cheer && justApplied ? <OttoCheer className="absolute right-2 -bottom-1" /> : null}
        </PaperWell>

        <div className="flex flex-1 flex-col px-2 pt-4 pb-2">
          <div className="min-w-0">
            <h3
              id={titleId}
              className="line-clamp-2 text-lg/6 font-medium tracking-tight break-words text-ink"
            >
              {title}
            </h3>
            {person ? <p className="mt-1 text-sm/5 break-words text-muted">{person}</p> : null}
            <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm/5 text-subtle">
              <span>{format}</span>
              <span aria-hidden className="size-0.75 rounded-full bg-subtle/60" />
              <time {...editedAt(resume.updatedAt)}>
                Edited {formatRelativeTime(resume.updatedAt, now)}
              </time>
            </p>
            {showJob ? (
              <p className="mt-2.5 flex min-w-0 items-start gap-2 text-sm/5 text-ink">
                <BriefcaseBusiness aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
                <span className="line-clamp-2 min-w-0 break-words">{job}</span>
              </p>
            ) : null}
            {base ? <MadeFrom base={base} onShowBase={onShowBase} /> : null}
          </div>

          {chips.length > 0 ? (
            <div className="mt-4">
              <CardChips chips={chips} />
            </div>
          ) : null}

          <div className="mt-auto flex items-center gap-2 pt-5">
            <Button
              size="sm"
              onClick={open}
              aria-describedby={titleId}
              data-card-open=""
              className="pr-3 pl-4"
            >
              Open
              <ArrowRight
                aria-hidden
                className="text-white/75 transition-transform duration-200 ease-out group-hover/card:translate-x-0.5 group-hover/card:text-white"
              />
            </Button>
            {tailored ? <MarkApplied resume={resume} describedBy={titleId} /> : null}
            <Menu
              label={`Actions for ${title}`}
              align="end"
              triggerLabel={`More actions for ${title}`}
              triggerClassName={buttonClasses({
                variant: "ghost",
                size: "icon-sm",
                className: "ml-auto text-muted hover:text-ink aria-expanded:text-ink",
              })}
              trigger={<Ellipsis aria-hidden />}
              items={[
                {
                  label: "Tailor to a job",
                  icon: Target,
                  pro: tailorLocked,
                  onSelect: () =>
                    tailorLocked ? openFeaturePrompt("tailor") : actions.open(resume.id, "tailor"),
                },
                {
                  label: "Import from GitHub",
                  icon: FolderGit,
                  pro: locked,
                  onSelect: () => (locked ? openFeaturePrompt("github") : openGitHub()),
                },
                "separator",
                {
                  label: "Download PDF",
                  icon: Download,
                  onSelect: () => actions.open(resume.id, "download"),
                },
                { label: "Copy share link", icon: Link2, pro: locked, onSelect: share.share },
                { label: "Share link settings", icon: Settings2, onSelect: share.open },
                {
                  label: "Make my portfolio",
                  icon: Globe,
                  pro: locked,
                  onSelect: () =>
                    locked ? openUpgradePrompt("portfolio") : router.push(portfolioFrom(resume.id)),
                },
                {
                  label: "Export JSON",
                  icon: FileBraces,
                  onSelect: () => downloadJsonResume(resume),
                },
                "separator",
                { label: "Rename", icon: PenLine, onSelect: () => onRename(resume) },
                { label: "Duplicate", icon: Copy, onSelect: () => onDuplicate(resume) },
                "separator",
                {
                  label: "Delete",
                  icon: Trash2,
                  tone: "danger",
                  onSelect: () => onDelete(resume),
                },
              ]}
            />
          </div>
        </div>
      </FolderCard>
      {github.used && GitHubImportDialog ? (
        <GitHubImportDialog
          resume={resume}
          open={github.open}
          onOpenChange={(open) => setGithub({ used: true, open })}
        />
      ) : null}
      {share.dialog}
    </article>
  );
}

const MADE_FROM =
  "text-left font-medium break-words text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink";

function MadeFrom({ base, onShowBase }: { base: Resume; onShowBase?: (id: string) => void }) {
  const name = resumeTitle(base);
  return (
    <p className="mt-2 flex min-w-0 items-start gap-2 text-sm/5 text-muted">
      <CornerDownRight aria-hidden className="mt-0.5 size-4 shrink-0 text-subtle" />
      <span className="shrink-0">Made from</span>
      {onShowBase ? (
        <button
          type="button"
          onClick={() => onShowBase(base.id)}
          className={cn(MADE_FROM, "min-w-0")}
        >
          {name}
        </button>
      ) : (
        <Link
          href={`${ROUTES.dashboardResumes}#${cardId(base.id)}`}
          className={cn(MADE_FROM, "min-w-0")}
        >
          {name}
        </Link>
      )}
    </p>
  );
}
