import type { ReactNode } from "react";
import { Otto } from "@/components/mascot/otto";
import type { OttoPose } from "@/components/mascot/otto-poses";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Panel } from "@/components/ui/panel";
import { fmt } from "@/i18n/format";
import type { HomeMessages, HomeProps } from "./home-copy";
import {
  ChecksMoment,
  DownloadMoment,
  type MomentProps,
  TailorMoment,
  UploadMoment,
} from "./how-it-works-moments";
import { HowItWorksNav } from "./how-it-works-nav";
import { LineFixerMoment } from "./line-fixer-example";
import { MomentCaption, Section, SectionHeader } from "./section";

type Step = {
  id: string;
  key: keyof HomeMessages["how"]["steps"];
  otto: OttoPose;
  Moment: (props: MomentProps) => ReactNode;
};

const STEPS: readonly Step[] = [
  { id: "upload", key: "upload", otto: "read", Moment: UploadMoment },
  { id: "recruiter-view", key: "recruiterView", otto: "point", Moment: ChecksMoment },
  { id: "fix", key: "fix", otto: "think", Moment: LineFixerMoment },
  { id: "tailor", key: "tailor", otto: "read", Moment: TailorMoment },
  { id: "download", key: "download", otto: "cheer", Moment: DownloadMoment },
];

const momentId = (step: Step) => `how-${step.id}`;

export function HowItWorks({ t, format, common }: Pick<HomeProps, "t" | "format" | "common">) {
  const how = t.how;
  return (
    <Section
      id="how"
      labelledBy="how-title"
      animated
      lazySize="[contain-intrinsic-size:auto_3400px] sm:[contain-intrinsic-size:auto_2850px]"
    >
      <SectionHeader id="how-title" eyebrow={how.eyebrow} title={how.title}>
        {how.intro}
      </SectionHeader>
      <div className="mt-12 grid gap-12 sm:mt-16 lg:grid-cols-3">
        <HowItWorksNav
          items={STEPS.map((step) => ({ id: momentId(step), name: how.steps[step.key].name }))}
          className="self-start max-lg:hidden lg:sticky lg:top-24"
        />
        <div className="flex flex-col gap-24 lg:col-span-2">
          {STEPS.map((step, index) => {
            const { name, caption } = how.steps[step.key];
            return (
              <article
                key={step.id}
                id={momentId(step)}
                aria-labelledby={`${momentId(step)}-title`}
                className="scroll-mt-24"
              >
                <Eyebrow className="mb-3 lg:hidden">
                  {fmt(how.step, { number: format.number(index + 1), name })}
                </Eyebrow>
                <Panel>
                  <step.Moment t={t} format={format} />
                </Panel>
                <MomentCaption
                  titleAs="h3"
                  titleId={`${momentId(step)}-title`}
                  title={name}
                  otto={
                    <Otto
                      pose={step.otto}
                      size={64}
                      title={common?.otto}
                      lively
                      delay={-1.3 * index}
                    />
                  }
                >
                  {caption}
                </MomentCaption>
              </article>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
