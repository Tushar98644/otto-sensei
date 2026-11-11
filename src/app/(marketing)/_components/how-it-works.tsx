import type { ReactNode } from "react";
import { Otto } from "@/components/mascot/otto";
import type { OttoPose } from "@/components/mascot/otto-poses";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Panel } from "@/components/ui/panel";
import { ChecksMoment, DownloadMoment, TailorMoment, UploadMoment } from "./how-it-works-moments";
import { HowItWorksNav } from "./how-it-works-nav";
import { LineFixerMoment } from "./line-fixer-example";
import { MomentCaption, Section, SectionHeader } from "./section";

type Step = { id: string; name: string; caption: string; moment: ReactNode; otto: OttoPose };

const STEPS: readonly Step[] = [
  {
    id: "upload",
    otto: "read",
    name: "Upload",
    caption: "Drop in your PDF or Word file, or start from scratch.",
    moment: <UploadMoment />,
  },
  {
    id: "recruiter-view",
    otto: "point",
    name: "Recruiter view",
    caption: "See the text hiring software pulls out, with plain checks and the reason for each.",
    moment: <ChecksMoment />,
  },
  {
    id: "fix",
    otto: "think",
    name: "Fix lines with Otto",
    caption:
      "Otto asks for the missing fact, then writes the line from your answer. He never makes up numbers, and you keep, edit or skip every suggestion.",
    moment: <LineFixerMoment />,
  },
  {
    id: "tailor",
    otto: "read",
    name: "Tailor to a job",
    caption: "Paste a job post to see which keywords you have and which are missing.",
    moment: <TailorMoment />,
  },
  {
    id: "download",
    otto: "cheer",
    name: "Free PDF",
    caption:
      "Download a clean PDF that hiring software can read, then check it again. Free, always.",
    moment: <DownloadMoment />,
  },
];

const momentId = (step: Step) => `how-${step.id}`;

export function HowItWorks() {
  return (
    <Section id="how" labelledBy="how-title">
      <SectionHeader id="how-title" eyebrow="How it works" title="From old file to clean PDF">
        Five steps. Stop after any of them.
      </SectionHeader>
      <div className="mt-12 grid gap-12 sm:mt-16 lg:grid-cols-3">
        <HowItWorksNav
          items={STEPS.map((step) => ({ id: momentId(step), name: step.name }))}
          className="self-start max-lg:hidden lg:sticky lg:top-24"
        />
        <div className="flex flex-col gap-24 lg:col-span-2">
          {STEPS.map((step, index) => (
            <article
              key={step.id}
              id={momentId(step)}
              aria-labelledby={`${momentId(step)}-title`}
              className="scroll-mt-24"
            >
              <Eyebrow className="mb-3 lg:hidden">
                Step {index + 1} · {step.name}
              </Eyebrow>
              <Panel>{step.moment}</Panel>
              <MomentCaption
                titleAs="h3"
                titleId={`${momentId(step)}-title`}
                title={step.name}
                otto={<Otto pose={step.otto} size={64} lively delay={-1.3 * index} />}
              >
                {step.caption}
              </MomentCaption>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}
