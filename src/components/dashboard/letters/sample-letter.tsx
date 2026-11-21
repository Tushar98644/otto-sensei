import { useId, type ReactNode } from "react";
import { FolderCard } from "@/components/ui/folder-card";

// Written by hand from the Jordan Ellis sample resume (lib/resume/sample.ts), so every fact is one of its lines.
const SAMPLE_JOB = "Senior Product Marketing Manager";

const SAMPLE_LETTER: readonly string[] = [
  "Dear hiring team,",
  "I'd like to apply for the Senior Product Marketing Manager role. At Brightloop, I led the launch of an analytics add-on that reached 1,200 paying teams and $1.4M in yearly revenue in its first 12 months.",
  "I also rebuilt our pricing page with the design and growth teams, which lifted trial-to-paid conversion from 9% to 13% in one quarter. Before that, at Northwind Analytics, I grew the email newsletter from 8,000 to 31,000 subscribers by testing new formats every week.",
  "I'd bring the same habits to your team: customer interviews first, then clear messaging that helps sales win deals.",
  "Best regards,\nJordan Ellis",
];

// The letter fades out before its end, so the offer under it reads as the rest of the page.
export function SampleLetter({ children }: { children?: ReactNode }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="max-w-3xl">
      <FolderCard
        tab="Example"
        tabEnd={<span className="text-xs text-subtle">Jordan Ellis, a sample resume</span>}
        bodyClassName="p-5 sm:p-10"
      >
        <div className="flex flex-col gap-1">
          <h2 id={headingId} className="font-sans text-lg/7 font-medium text-ink">
            Cover letter for {SAMPLE_JOB}
          </h2>
          <p className="text-sm/6 text-muted">Every fact comes from the resume. Nothing is made up.</p>
        </div>
        <div className="mt-6 flex max-h-56 flex-col gap-4 overflow-hidden text-base/7 text-pretty text-ink mask-b-from-35% sm:max-h-88">
          {SAMPLE_LETTER.map((paragraph) => (
            <p key={paragraph} className="whitespace-pre-line">
              {paragraph}
            </p>
          ))}
        </div>
        {children ? <div className="mt-2">{children}</div> : null}
      </FolderCard>
    </section>
  );
}
