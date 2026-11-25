"use client";

import { HERO_CTA_ID } from "@/components/site/hero-cta-in-view";
import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { rich } from "@/i18n/rich";
import { useSavedResumeTitle } from "@/lib/store/saved-title";
import { pickResumeFile, preloadOpener } from "./home-picker";
import { PrimaryCta, type PrimaryCtaCopy } from "./primary-cta";

export type HeroCtaCopy = {
  cta: PrimaryCtaCopy;
  noSignup: string;
  another: string;
  jobPost: string;
  // The job match page in this page's language.
  jobMatch: string;
};

export function HeroCta({ copy }: { copy: HeroCtaCopy }) {
  const savedTitle = useSavedResumeTitle();
  return (
    <div className="mt-8 flex w-full flex-col items-center">
      <PrimaryCta copy={copy.cta} id={HERO_CTA_ID} savedTitle={savedTitle} />
      <p className="mt-3 text-sm text-subtle">
        {savedTitle
          ? rich(copy.another, {
              link: (chunk) => (
                <TextLink
                  href={ROUTES.studio}
                  onMouseEnter={preloadOpener}
                  onFocus={preloadOpener}
                  onNavigate={(event) => {
                    if (pickResumeFile()) event.preventDefault();
                  }}
                >
                  {chunk}
                </TextLink>
              ),
            })
          : copy.noSignup}
      </p>
      <p className="mt-1 text-sm text-subtle">
        {rich(copy.jobPost, {
          link: (chunk) => <TextLink href={copy.jobMatch}>{chunk}</TextLink>,
        })}
      </p>
    </div>
  );
}
