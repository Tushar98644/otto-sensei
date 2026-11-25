import { useId } from "react";
import { Paper, PaperHead } from "./letter-paper";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";

// Written by hand from the Jordan Ellis sample resume (lib/resume/sample.ts), so every fact is one of its lines.
const SAMPLE_JOB = "Senior Product Marketing Manager";
const SAMPLE_CONTACT = "jordan.ellis@example.com  ·  +1 555 014 2398  ·  Remote";

const SAMPLE_LETTER: readonly string[] = [
  "Dear hiring team,",
  "I'd like to apply for the Senior Product Marketing Manager role. At Brightloop, I led the launch of an analytics add-on that reached 1,200 paying teams and $1.4M in yearly revenue in its first 12 months.",
  "I also rebuilt our pricing page with the design and growth teams, which lifted trial-to-paid conversion from 9% to 13% in one quarter. Before that, at Northwind Analytics, I grew the email newsletter from 8,000 to 31,000 subscribers by testing new formats every week.",
  "I'd bring the same habits to your team: customer interviews first, then clear messaging that helps sales win deals.",
  "Best regards,\nJordan Ellis",
];

export function SampleLetter() {
  const headingId = useId();
  const t = useMessages("letters").reader;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
        <h2 id={headingId} className="font-sans text-base/6 font-medium text-ink">
          {fmt(t.sampleHeading, { job: SAMPLE_JOB })}
        </h2>
        <p className="text-sm/6 text-muted">{t.sampleNote}</p>
      </div>
      <Paper className="mask-b-from-55% lg:max-w-[46rem]">
        <div className="flex flex-col gap-7">
          <PaperHead name="Jordan Ellis" contact={SAMPLE_CONTACT} />
          <div className="flex flex-col gap-5 font-display text-[1.1875rem]/8 text-pretty text-ink">
            {SAMPLE_LETTER.map((paragraph) => (
              <p key={paragraph} className="whitespace-pre-line">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </Paper>
    </section>
  );
}
