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
import { FolderCard } from "@/components/ui/folder-card";
import { ProMark } from "@/components/ui/pro-mark";
import { useMessages } from "@/i18n/client";
import type { Resume } from "@/lib/resume/schema";
import { CheckArt, FormatsArt, TailorArt } from "../action-art";
import type { StudioActions } from "../use-studio-actions";
import { useTailorLocked } from "../use-tailor-locked";

type Target = { onClick: () => void; href?: never } | { href: string; onClick?: never };

type Action = {
  tab: string;
  icon: LucideIcon;
  art: ReactNode;
  title: string;
  detail: string;
  pro?: boolean;
  target: Target;
};

// Phones get one compact row of keys; the illustrated cards would run a screen and a half.
export function ActionCards({
  actions,
  latest,
  pageResume,
}: {
  actions: StudioActions;
  latest: Resume | null;
  pageResume: Resume;
}) {
  const { actions: t, home } = useMessages("dashboard");
  const tailorLocked = useTailorLocked();
  const items: Action[] = [
    {
      tab: t.checkTab,
      icon: ScanSearch,
      art: <CheckArt resume={pageResume} />,
      title: t.checkTitle,
      detail: t.checkDetail,
      target: { onClick: actions.upload },
    },
    {
      tab: t.tailorTab,
      icon: BriefcaseBusiness,
      art: <TailorArt />,
      title: t.tailorTitle,
      detail: t.tailorDetail,
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
      tab: t.formatsTab,
      icon: LayoutTemplate,
      art: <FormatsArt resume={pageResume} />,
      title: t.formatsTitle,
      detail: t.formatsDetail,
      target: { href: ROUTES.dashboardFormats },
    },
  ];

  return (
    <section aria-labelledby="actions-heading" data-tour="dashboard-actions">
      <h2 id="actions-heading" className="sr-only">
        {home.quickActions}
      </h2>
      <ul className="grid grid-cols-3 gap-2 md:hidden">
        {items.map((item) => (
          <li key={item.tab}>
            <ActionTarget
              target={item.target}
              className="flex h-full min-h-20 w-full flex-col items-start justify-between gap-2 rounded-2xl bg-surface p-3 text-left text-sm/5 font-medium text-pretty text-ink transition-colors hover:bg-surface-hover"
            >
              <item.icon aria-hidden className="size-5 text-muted" />
              <span>
                {item.title}
                {item.pro ? <ProMark className="ml-1.5 align-middle" /> : null}
              </span>
            </ActionTarget>
          </li>
        ))}
      </ul>
      <ul className="grid grid-cols-3 gap-x-5 max-md:hidden">
        {items.map((item) => (
          <li
            key={item.tab}
            className="group/action group/otto relative rounded-2xl has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink"
          >
            <FolderCard tab={item.tab} className="h-full" bodyClassName="flex flex-col p-2">
              {item.art}
              <div className="px-2 pt-4 pb-2">
                <ActionTarget
                  target={item.target}
                  className="inline-flex items-center gap-1.5 text-base/6 font-medium text-ink outline-none after:absolute after:inset-0 after:rounded-2xl"
                >
                  {item.title}
                  {item.pro ? <ProMark /> : null}
                  <ArrowRight
                    aria-hidden
                    className="size-4 text-muted transition-transform group-hover/action:translate-x-0.5 group-hover/action:text-ink"
                  />
                </ActionTarget>
                <p className="mt-1 text-sm/6 text-muted">{item.detail}</p>
              </div>
            </FolderCard>
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
