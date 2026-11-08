import type { ReactNode } from "react";
import { LEGAL_LAST_UPDATED } from "@/components/site/routes";

export type LegalPageProps = {
  title: string;
  children: ReactNode;
};

// LEGAL_LAST_UPDATED is a plain calendar date, so it's read and shown in UTC; a local time zone
// west of UTC would show the day before.
const LAST_UPDATED_LABEL = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
}).format(new Date(`${LEGAL_LAST_UPDATED}T00:00:00Z`));

// Shared frame for privacy, terms and refunds: one readable column with the last-updated date up
// top, as the policies promise.
export function LegalPage({ title, children }: LegalPageProps) {
  return (
    <div className="container-page py-12 sm:py-16">
      <article className="mx-auto prose-otto">
        <h1>{title}</h1>
        <p className="text-sm text-muted">
          Last updated: <time dateTime={LEGAL_LAST_UPDATED}>{LAST_UPDATED_LABEL}</time>
        </p>
        {children}
      </article>
    </div>
  );
}
