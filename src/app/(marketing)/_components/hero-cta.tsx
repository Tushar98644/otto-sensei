"use client";

import { HERO_CTA_ID } from "@/components/site/hero-cta-in-view";
import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { SEO_PATHS } from "@/lib/seo-pages/paths";
import { useSavedResumeTitle } from "@/lib/store/saved-title";
import { pickResumeFile, preloadOpener } from "./home-picker";
import { PrimaryCta } from "./primary-cta";

export function HeroCta() {
  const savedTitle = useSavedResumeTitle();
  return (
    <div className="mt-8 flex w-full flex-col items-center">
      <PrimaryCta id={HERO_CTA_ID} savedTitle={savedTitle} />
      <p className="mt-3 text-sm text-subtle">
        {savedTitle ? (
          <>
            Or{" "}
            <TextLink
              href={ROUTES.studio}
              onMouseEnter={preloadOpener}
              onFocus={preloadOpener}
              onNavigate={(event) => {
                if (pickResumeFile()) event.preventDefault();
              }}
            >
              check another file
            </TextLink>
            . It&apos;s read, then deleted.
          </>
        ) : (
          "No signup needed. Your file is read, then deleted."
        )}
      </p>
      <p className="mt-1 text-sm text-subtle">
        Have a job post? <TextLink href={SEO_PATHS.jobMatch}>Check your match</TextLink>.
      </p>
    </div>
  );
}
