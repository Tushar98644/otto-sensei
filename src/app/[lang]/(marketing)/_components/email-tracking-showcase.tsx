import {
  EMAIL_BOARD_CLIP,
  GuideVideo,
} from "@/components/dashboard/applications/email/guide-video";
import type { HomeMessages, HomeProps } from "./home-copy";
import { Section, SectionHeader } from "./section";

const POINTS: readonly (keyof HomeMessages["emailTracking"]["points"])[] = [
  "setup",
  "board",
  "rules",
];

export function EmailTrackingShowcase({ t }: Pick<HomeProps, "t">) {
  const email = t.emailTracking;
  return (
    <Section
      id="email-tracking"
      labelledBy="email-tracking-title"
      lazySize="[contain-intrinsic-size:auto_1500px] sm:[contain-intrinsic-size:auto_1250px] lg:[contain-intrinsic-size:auto_980px]"
    >
      <SectionHeader id="email-tracking-title" eyebrow={email.eyebrow} title={email.title}>
        {email.intro}
      </SectionHeader>
      <figure className="mt-12 sm:mt-16">
        <div className="overflow-hidden rounded-3xl bg-surface p-2 shadow-card sm:p-3">
          <GuideVideo src={EMAIL_BOARD_CLIP} width={1440} height={1000} />
        </div>
        <figcaption className="mt-4 max-w-3xl text-sm/6 text-pretty text-subtle">
          {email.caption}
        </figcaption>
      </figure>
      <ul
        role="list"
        className="mt-10 grid gap-x-8 gap-y-8 border-t border-border pt-10 sm:grid-cols-3"
      >
        {POINTS.map((key) => (
          <li key={key} className="flex flex-col gap-2">
            <h3 className="text-lg/7 font-medium tracking-tight text-ink">
              {email.points[key].title}
            </h3>
            <p className="max-w-prose text-base/7 text-muted">{email.points[key].text}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
