"use client";

import { useShares } from "@/components/share/share-store";
import { resumeHrefFor } from "@/lib/portfolio/resume-link";
import type { Portfolio } from "@/lib/portfolio/types";
import type { Resume } from "@/lib/resume/schema";

export type ResumeLink = { href: string | null; shared: boolean };

// The share's own copy stays on the server, so the preview reads contact from the page's resume.
export function useResumeLink(portfolio: Portfolio, shown: Resume): ResumeLink {
  const { links } = useShares();
  const share = links.find((link) => link.resumeId === portfolio.resumeId) ?? null;
  const href = resumeHrefFor(
    share
      ? {
          slug: share.slug,
          showContact: share.showContact,
          email: shown.basics.email.trim(),
          phone: shown.basics.phone.trim(),
        }
      : null,
    portfolio,
  );
  return { href, shared: share !== null };
}
