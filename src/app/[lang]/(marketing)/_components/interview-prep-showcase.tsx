import {
  Mail,
  MessageCircleQuestion,
  NotebookPen,
  Play,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { GuideVideo, INTERVIEW_CLIP } from "@/components/dashboard/applications/email/guide-video";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";
import { displayItalic } from "./display-italic";
import type { HomeMessages, HomeProps } from "./home-copy";
import { Section, SectionHeader } from "./section";

type Words = HomeMessages["interviewPrep"];

const POINTS: readonly { key: keyof Words["points"]; icon: LucideIcon }[] = [
  { key: "questions", icon: MessageCircleQuestion },
  { key: "stories", icon: ScrollText },
  { key: "craft", icon: Play },
];

// The two parts of the app that have no section of their own on this page.
const ALSO: readonly {
  key: Exclude<keyof Words["also"], "title">;
  icon: LucideIcon;
  pro: boolean;
}[] = [
  { key: "letters", icon: Mail, pro: true },
  { key: "careerLog", icon: NotebookPen, pro: false },
];

export function InterviewPrepShowcase({ t, common }: Pick<HomeProps, "t" | "common">) {
  const prep = t.interviewPrep;
  return (
    <Section
      id="interview-prep"
      labelledBy="interview-prep-title"
      lazySize="[contain-intrinsic-size:auto_1815px] sm:[contain-intrinsic-size:auto_1840px] lg:[contain-intrinsic-size:auto_1885px]"
    >
      <SectionHeader
        id="interview-prep-title"
        eyebrow={prep.eyebrow}
        title={
          <>
            {prep.title} <em className={cn("block", displayItalic.className)}>{prep.titleEm}</em>
          </>
        }
      >
        {prep.intro}
      </SectionHeader>
      <figure className="mt-12 sm:mt-16">
        <div className="rounded-3xl bg-linear-to-b from-surface-strong/55 to-surface-muted/50 p-2.5 ring-1 ring-ink/5 ring-inset sm:rounded-4xl sm:p-8 lg:p-12">
          <div className="rounded-xl shadow-float">
            <GuideVideo src={INTERVIEW_CLIP} width={3840} height={2880} labels={common?.video} />
          </div>
        </div>
        <figcaption className="mt-5 max-w-3xl text-sm/6 text-pretty text-subtle">
          {prep.caption}
        </figcaption>
      </figure>
      <ul role="list" className="mt-16 grid gap-10 sm:mt-20 lg:grid-cols-3 lg:gap-14">
        {POINTS.map(({ key, icon: Icon }) => (
          <li key={key} className="flex gap-5 lg:flex-col">
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-ink shadow-control ring-1 ring-ink/8"
            >
              <Icon className="size-4.5" />
            </span>
            <div className="flex max-w-prose flex-col gap-2">
              <h3 className="text-lg/7 font-medium tracking-tight text-ink">
                {prep.points[key].title}
              </h3>
              <p className="text-base/7 text-pretty text-muted">{prep.points[key].text}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-16 flex flex-col gap-5 border-t border-border pt-8 sm:mt-20 lg:flex-row lg:gap-14">
        <Eyebrow id="also-in-otto" className="shrink-0 lg:w-32 lg:pt-1">
          {prep.also.title}
        </Eyebrow>
        <ul
          role="list"
          aria-labelledby="also-in-otto"
          className="grid flex-1 gap-6 sm:grid-cols-2 sm:gap-10"
        >
          {ALSO.map(({ key, icon: Icon, pro }) => (
            <li key={key} className="flex gap-3">
              <Icon aria-hidden className="mt-1 size-4 shrink-0 text-subtle" />
              <div className="flex min-w-0 flex-col gap-1">
                <p className="flex items-center gap-2 text-sm/6 font-medium text-ink">
                  {prep.also[key].label}
                  {pro ? (
                    <Badge variant="ink" className="h-5 px-1.5">
                      Pro
                    </Badge>
                  ) : null}
                </p>
                <p className="text-sm/6 text-pretty text-muted">{prep.also[key].text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
