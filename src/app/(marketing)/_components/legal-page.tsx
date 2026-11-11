import type { ReactNode } from "react";
import { LEGAL_LAST_UPDATED } from "@/components/site/routes";

export type LegalPageProps = {
  title: string;
  children: ReactNode;
};

// A plain calendar date: format it in UTC, or zones west of UTC show the day before.
const LAST_UPDATED_LABEL = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
}).format(new Date(`${LEGAL_LAST_UPDATED}T00:00:00Z`));

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
