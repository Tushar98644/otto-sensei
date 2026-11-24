import { ArrowRight, Inbox } from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Panel, Window } from "@/components/ui/panel";
import { cn } from "@/lib/utils";
import { Section, SectionHeader } from "./section";

type Example = {
  company: string;
  from: string;
  subject: string;
  role: string;
  stage: string;
  tone: BadgeVariant;
  detail: string;
};

// One sample hunt: each email and the card it moves, in the order they'd arrive.
const EXAMPLES: readonly Example[] = [
  {
    company: "Northwind",
    from: "Northwind Careers",
    subject: "Thanks for applying, Jordan",
    role: "Product Designer",
    stage: "Applied",
    tone: "neutral",
    detail: "Added to your board",
  },
  {
    company: "Brightloop",
    from: "Brightloop via Greenhouse",
    subject: "Interview invitation: Thursday, 3:00 PM",
    role: "UX Designer",
    stage: "Interview",
    tone: "ink",
    detail: "Thu, 3:00 PM on the card",
  },
  {
    company: "Acme",
    from: "Acme Talent",
    subject: "An update on your application",
    role: "Design Lead",
    stage: "Rejected",
    tone: "fail",
    detail: "Moved to closed",
  },
];

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

function InboxMock() {
  return (
    <Window title="Gmail" meta="Forwarded to Otto" bodyClassName="divide-y divide-border">
      {EXAMPLES.map((email) => (
        <div key={email.company} className="flex items-start gap-3 px-4 py-3 sm:px-5">
          <span
            aria-hidden
            className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-muted"
          >
            {email.company.charAt(0)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm/5 font-medium text-ink">{email.from}</span>
            <span className="block truncate text-sm/5 text-muted">{email.subject}</span>
          </span>
        </div>
      ))}
    </Window>
  );
}

function BoardMock() {
  return (
    <Window title="Applications" meta="Your board" bodyClassName="flex flex-col gap-2 p-3 sm:p-4">
      {EXAMPLES.map((email) => (
        <div
          key={email.company}
          className="flex items-center gap-3 rounded-xl bg-surface-muted px-3 py-2.5"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm/5 font-medium text-ink">{email.role}</span>
            <span className="block truncate text-xs/5 text-muted">
              {email.company} · {email.detail}
            </span>
          </span>
          <Badge variant={email.tone} className={cn(email.tone === "neutral" && "bg-surface")}>
            {email.stage}
          </Badge>
        </div>
      ))}
      <p className="flex items-center gap-1.5 px-1 pt-1 text-xs/5 text-subtle">
        <Inbox aria-hidden className="size-3.5" />
        Updated from your email
      </p>
    </Window>
  );
}

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
      <Panel
        role="img"
        aria-label="Example: three hiring emails in Gmail, and the cards they move on the Applications board: Northwind to Applied, Brightloop to Interview on Thursday at 3 PM, and Acme to Rejected."
        className="mt-12 grid items-start gap-6 sm:mt-16 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-8"
      >
        <div>
          <Eyebrow>In your inbox</Eyebrow>
          <div className="mt-3">
            <InboxMock />
          </div>
        </div>
        <ArrowRight
          aria-hidden
          className="mx-auto size-6 self-center text-subtle max-lg:rotate-90 lg:mt-8"
        />
        <div>
          <Eyebrow>On your board</Eyebrow>
          <div className="mt-3">
            <BoardMock />
          </div>
        </div>
      </Panel>
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
