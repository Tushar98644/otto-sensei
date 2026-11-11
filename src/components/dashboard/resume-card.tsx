"use client";

import {
  BriefcaseBusiness,
  Copy,
  CornerDownRight,
  Download,
  Ellipsis,
  FileBraces,
  FileText,
  FolderGit,
  Globe,
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
import { openFeaturePrompt } from "@/components/account/upgrade-prompt";
import { useGitHubReturn } from "@/components/github/connect-return";
import { OttoCheer } from "@/components/mascot/otto-cheer";
import { portfolioFrom } from "@/components/portfolio/route";
import { useShareResume } from "@/components/share/use-share-resume";
import { ROUTES } from "@/components/site/routes";
import { formatRelativeTime } from "@/components/studio/relative-time";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { FolderCard } from "@/components/ui/folder-card";
import { Menu } from "@/components/ui/menu";
import { StatusPill } from "@/components/ui/status";
import { toast } from "@/components/ui/toast";
import { downloadJsonResume } from "@/lib/jsonresume/download";
import { lintResume } from "@/lib/lint/bullets";
import { TEMPLATE_INFO, templateOf } from "@/lib/pdf/templates";
import { resumeTitle } from "@/lib/resume/ops";
import { copyLetter } from "@/lib/applications/thread";
import type { Resume } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";
import { cn, pluralize } from "@/lib/utils";
import { MarkApplied, useCopyApplication, useJustApplied } from "./applications/mark-applied";
import { SOURCE_TABS, tailoredJob } from "./library";
import { linesChip, reportChip } from "./resume-status";
import { ResumeThumbnail } from "./resume-thumbnail";
import type { StudioActions } from "./use-studio-actions";

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

export function cardId(resumeId: string): string {
  return `resume-${resumeId}`;
}

function defaultTailoredTitle(resume: Resume): string {
  const tailor = resume.tailor;
  if (!tailor) return "";
  return [tailor.jobTitle || "Tailored", tailor.company].filter(Boolean).join(" at ");
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
  const githubLocked = useProTools() === false;
  const share = useShareResume(resume);
  const router = useRouter();
  const report = useStudioStore((s) => s.reports[resume.id]);
  const lint = useMemo(() => lintResume(resume), [resume]);
  const title = resumeTitle(resume);
  const tailored = resume.tailor !== null;
  const job = tailoredJob(resume);
  const showJob = job !== null && resume.title.trim() !== defaultTailoredTitle(resume);
  const chips = [reportChip(report), linesChip(lint)].filter((chip) => chip !== null);
  const format = TEMPLATE_INFO[templateOf(resume)].name;
  const sentWith = useCopyApplication(resume);
  const marks = [
    copyLetter(resume) ? "Cover letter" : null,
    sentWith?.hasPrep ? "Interview prep" : null,
  ].filter((mark): mark is string => mark !== null);
  const open = () => actions.open(resume.id, "fix");

  return (
    <article aria-labelledby={titleId} className="group/card h-full">
      <FolderCard
        tab={SOURCE_TABS[resume.source]}
        tone={tailored ? "lavender" : "plain"}
        className="h-full"
        bodyClassName="flex flex-col p-2"
      >
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={open}
          className="relative h-44 overflow-hidden rounded-xl bg-surface-muted px-8 pt-6 sm:h-48"
        >
          <ResumeThumbnail
            resume={resume}
            className="rounded-t-xs shadow-page transition-[translate,box-shadow] duration-300 ease-out group-hover/card:-translate-y-1 group-hover/card:shadow-page-lift"
          />
          {cheer && justApplied ? <OttoCheer className="absolute right-2 -bottom-1" /> : null}
        </button>

        <div className="flex flex-1 flex-col gap-3 px-2 pt-4 pb-2">
          <div className="min-w-0">
            <h3 id={titleId} className="truncate text-base/6 font-medium text-ink">
              {title}
            </h3>
            <p className="mt-0.5 truncate text-sm/5 text-subtle">
              {format} · Edited {formatRelativeTime(resume.updatedAt, now)}
            </p>
            {showJob ? (
              <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-sm/5 text-muted">
                <BriefcaseBusiness aria-hidden className="size-3.5 shrink-0" />
                <span className="truncate">{job}</span>
              </p>
            ) : null}
            {base ? <MadeFrom base={base} onShowBase={onShowBase} /> : null}
          </div>

          {chips.length > 0 || copies > 0 || marks.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {chips.map((chip) => (
                <StatusPill key={chip.label} status={chip.status}>
                  {chip.label}
                </StatusPill>
              ))}
              {copies > 0 ? (
                <Badge>{pluralize(copies, "tailored copy", "tailored copies")}</Badge>
              ) : null}
              {marks.map((mark) => (
                <Badge key={mark}>
                  {mark === "Cover letter" ? <FileText aria-hidden /> : <MessagesSquare aria-hidden />}
                  {mark}
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="mt-auto flex items-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={open}
              aria-describedby={titleId}
              data-card-open=""
              className="px-4"
            >
              Open
            </Button>
            {tailored ? <MarkApplied resume={resume} describedBy={titleId} /> : null}
            <Menu
              label={`Actions for ${title}`}
              align="end"
              triggerLabel={`More actions for ${title}`}
              triggerClassName={buttonClasses({
                variant: "ghost",
                size: "icon-sm",
                className: "ml-auto text-muted hover:text-ink",
              })}
              trigger={<Ellipsis aria-hidden />}
              items={[
                {
                  label: "Tailor to a job",
                  icon: Target,
                  onSelect: () => actions.open(resume.id, "tailor"),
                },
                {
                  label: "Import from GitHub",
                  icon: FolderGit,
                  description: githubLocked ? "Comes with Pro" : undefined,
                  onSelect: () => (githubLocked ? openFeaturePrompt("github") : openGitHub()),
                },
                "separator",
                {
                  label: "Download PDF",
                  icon: Download,
                  onSelect: () => actions.open(resume.id, "download"),
                },
                { label: "Copy share link", icon: Link2, onSelect: share.share },
                { label: "Share link settings", icon: Settings2, onSelect: share.open },
                {
                  label: "Make my portfolio",
                  icon: Globe,
                  onSelect: () => router.push(portfolioFrom(resume.id)),
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
  "truncate font-medium text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink";

function MadeFrom({ base, onShowBase }: { base: Resume; onShowBase?: (id: string) => void }) {
  const name = resumeTitle(base);
  return (
    <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-sm/5 text-muted">
      <CornerDownRight aria-hidden className="size-3.5 shrink-0" />
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
