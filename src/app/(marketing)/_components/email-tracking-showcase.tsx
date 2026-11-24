import {
  EMAIL_BOARD_CLIP,
  GuideVideo,
} from "@/components/dashboard/applications/email/guide-video";
import { Section, SectionHeader } from "./section";

const POINTS: readonly { title: string; text: string }[] = [
  {
    title: "Set up once, in Gmail",
    text: "You get your own Otto address and one Gmail filter that forwards only job emails to it. Three steps, a few minutes, with a test at the end.",
  },
  {
    title: "The board moves by itself",
    text: "A thank-you adds the job to Applied, an interview or test invite moves it to Interview with the date, and offers and rejections land where they belong. A card never moves back.",
  },
  {
    title: "Read by rules, kept small",
    text: "Otto reads each email with fixed rules, no AI, and keeps only the sender's domain, the subject and what it found. Mail it can't verify waits in a Check this list for you.",
  },
];

export function EmailTrackingShowcase() {
  return (
    <Section
      id="email-tracking"
      labelledBy="email-tracking-title"
      lazySize="[contain-intrinsic-size:auto_1500px] sm:[contain-intrinsic-size:auto_1250px] lg:[contain-intrinsic-size:auto_980px]"
    >
      <SectionHeader
        id="email-tracking-title"
        eyebrow="Email tracking · Pro"
        title="Your applications update themselves"
      >
        Hiring emails already say where each application stands. Forward them to Otto once, and your
        board keeps up without you dragging a single card.
      </SectionHeader>
      <figure className="mt-12 sm:mt-16">
        <div className="overflow-hidden rounded-3xl bg-surface p-2 shadow-card sm:p-3">
          <GuideVideo src={EMAIL_BOARD_CLIP} width={1440} height={1000} />
        </div>
        <figcaption className="mt-4 max-w-3xl text-sm/6 text-pretty text-subtle">
          The real board as three emails arrive: Northwind&apos;s thank-you adds the job,
          Brightloop&apos;s invite moves it to Interviewing with the date, and Acme&apos;s update
          closes it.
        </figcaption>
      </figure>
      <ul
        role="list"
        className="mt-10 grid gap-x-8 gap-y-8 border-t border-border pt-10 sm:grid-cols-3"
      >
        {POINTS.map(({ title, text }) => (
          <li key={title} className="flex flex-col gap-2">
            <h3 className="text-lg/7 font-medium tracking-tight text-ink">{title}</h3>
            <p className="max-w-prose text-base/7 text-muted">{text}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
