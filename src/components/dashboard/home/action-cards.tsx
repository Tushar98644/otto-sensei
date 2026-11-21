"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  LayoutTemplate,
  ScanSearch,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { openFeaturePrompt } from "@/components/account/upgrade-prompt";
import { ROUTES } from "@/components/site/routes";
import { ProMark } from "@/components/ui/pro-mark";
import type { Resume } from "@/lib/resume/schema";
import type { StudioActions } from "../use-studio-actions";
import { useTailorLocked } from "../use-tailor-locked";

type Target = { onClick: () => void; href?: never } | { href: string; onClick?: never };

type Action = {
  key: string;
  icon: LucideIcon;
  title: string;
  detail: string;
  pro?: boolean;
  target: Target;
};

// Quiet shortcuts under Up next, which holds the one primary action; phones drop the detail line.
export function ActionCards({ actions, latest }: { actions: StudioActions; latest: Resume | null }) {
  const tailorLocked = useTailorLocked();
  const items: Action[] = [
    {
      key: "check",
      icon: ScanSearch,
      title: "Check a resume",
      detail: "See what hiring software reads from your file.",
      target: { onClick: actions.upload },
    },
    {
      key: "tailor",
      icon: BriefcaseBusiness,
      title: "Tailor to a job",
      detail: "Paste a job link. See what it asks for.",
      pro: tailorLocked,
      target: {
        onClick: () =>
          tailorLocked
            ? openFeaturePrompt("tailor")
            : latest
              ? actions.open(latest.id, "tailor")
              : actions.upload(),
      },
    },
    {
      key: "formats",
      icon: LayoutTemplate,
      title: "Pick a format",
      detail: "Six clean looks for one resume.",
      target: { href: ROUTES.dashboardFormats },
    },
  ];

  return (
    <section aria-labelledby="actions-heading" data-tour="dashboard-actions">
      <h2 id="actions-heading" className="sr-only">
        Quick actions
      </h2>
      <ul className="grid grid-cols-3 gap-2 sm:gap-4">
        {items.map((item) => (
          <li key={item.key}>
            <ActionTarget
              target={item.target}
              className="group/action flex h-full min-h-20 w-full flex-col items-start gap-2 rounded-2xl bg-surface p-3 text-left transition-colors duration-150 ease-out hover:bg-surface-hover md:flex-row md:gap-4 md:p-5"
            >
              <span
                aria-hidden
                className="flex shrink-0 items-center justify-center text-muted transition-colors duration-150 ease-out group-hover/action:text-ink md:size-10 md:rounded-xl md:bg-surface-muted"
              >
                <item.icon className="size-5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-sm/5 font-medium text-pretty text-ink md:flex md:items-center md:gap-1.5 md:text-base/6">
                  {item.title}
                  {item.pro ? <ProMark className="max-md:ml-1.5 max-md:align-middle" /> : null}
                  <ArrowRight
                    aria-hidden
                    className="size-4 text-muted transition-transform duration-150 ease-out group-hover/action:translate-x-0.5 group-hover/action:text-ink max-md:hidden"
                  />
                </span>
                <span className="text-sm/5 text-pretty text-muted max-md:hidden">{item.detail}</span>
              </span>
            </ActionTarget>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ActionTarget({
  target,
  className,
  children,
}: {
  target: Target;
  className: string;
  children: ReactNode;
}) {
  return target.href ? (
    <Link href={target.href} className={className}>
      {children}
    </Link>
  ) : (
    <button type="button" onClick={target.onClick} className={className}>
      {children}
    </button>
  );
}
