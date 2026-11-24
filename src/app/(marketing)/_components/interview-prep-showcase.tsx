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
import { Section, SectionHeader } from "./section";

const POINTS: readonly { title: string; text: string; icon: LucideIcon }[] = [
  {
    title: "Likely questions, round by round",
    text: "From the opening to the closing, each question says what the interviewer is checking, the points to hit and the follow-up to expect. Then come questions for you to ask them.",
    icon: MessageCircleQuestion,
  },
  {
    title: "Stories from your own lines",
    text: "Each story starts from a line on your resume, told as situation, task, action and result. Anything your resume doesn't say stays a blank for you to fill, never made up.",
    icon: ScrollText,
  },
  {
    title: "A round on your craft, then practice",
    text: "Technical roles get a technical round on your projects, core concepts and system design. Designers and product managers get one on their craft. Then Otto plays the interviewer, one question at a time.",
    icon: Play,
  },
];

// The two parts of the app that have no section of their own on this page.
const ALSO: readonly { label: string; icon: LucideIcon; pro: boolean; text: string }[] = [
  {
    label: "Letters",
    icon: Mail,
    pro: true,
    text: "Cover letters, outreach messages and answers to application questions, written only from your resume and the job post.",
  },
  {
    label: "Career log",
    icon: NotebookPen,
    pro: false,
    text: "A one-minute note on your work each month, free on every plan. On Pro, Otto turns the notes into resume lines with your own numbers.",
  },
];

export function InterviewPrepShowcase() {
  return (
    <Section
      id="interview-prep"
      labelledBy="interview-prep-title"
      lazySize="[contain-intrinsic-size:auto_1815px] sm:[contain-intrinsic-size:auto_1840px] lg:[contain-intrinsic-size:auto_1885px]"
    >
      <SectionHeader
        id="interview-prep-title"
        eyebrow="Interview prep · Pro"
        title={
          <>
            Know what they&apos;ll ask,{" "}
            <em className={cn("block", displayItalic.className)}>and what you&apos;ll say.</em>
          </>
        }
      >
        For each interview, Otto reads the job post and your resume and writes a prep pack for that
        one job. Then you practice it out loud, with Otto asking.
      </SectionHeader>
      <figure className="mt-12 sm:mt-16">
        <div className="rounded-3xl bg-linear-to-b from-surface-strong/55 to-surface-muted/50 p-2.5 ring-1 ring-ink/5 ring-inset sm:rounded-4xl sm:p-8 lg:p-12">
          <div className="rounded-xl shadow-float">
            <GuideVideo src={INTERVIEW_CLIP} width={3840} height={2880} />
          </div>
        </div>
        <figcaption className="mt-5 max-w-3xl text-sm/6 text-pretty text-subtle">
          A real prep pack for a Product Designer interview at Northwind: the likely questions, a
          story from the resume, the design craft round and practice mode.
        </figcaption>
      </figure>
      <ul role="list" className="mt-16 grid gap-10 sm:mt-20 lg:grid-cols-3 lg:gap-14">
        {POINTS.map(({ title, text, icon: Icon }) => (
          <li key={title} className="flex gap-5 lg:flex-col">
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-ink shadow-control ring-1 ring-ink/8"
            >
              <Icon className="size-4.5" />
            </span>
            <div className="flex max-w-prose flex-col gap-2">
              <h3 className="text-lg/7 font-medium tracking-tight text-ink">{title}</h3>
              <p className="text-base/7 text-pretty text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-16 flex flex-col gap-5 border-t border-border pt-8 sm:mt-20 lg:flex-row lg:gap-14">
        <Eyebrow id="also-in-otto" className="shrink-0 lg:w-32 lg:pt-1">
          Also in Otto
        </Eyebrow>
        <ul
          role="list"
          aria-labelledby="also-in-otto"
          className="grid flex-1 gap-6 sm:grid-cols-2 sm:gap-10"
        >
          {ALSO.map(({ label, icon: Icon, pro, text }) => (
            <li key={label} className="flex gap-3">
              <Icon aria-hidden className="mt-1 size-4 shrink-0 text-subtle" />
              <div className="flex min-w-0 flex-col gap-1">
                <p className="flex items-center gap-2 text-sm/6 font-medium text-ink">
                  {label}
                  {pro ? (
                    <Badge variant="ink" className="h-5 px-1.5">
                      Pro
                    </Badge>
                  ) : null}
                </p>
                <p className="text-sm/6 text-pretty text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
