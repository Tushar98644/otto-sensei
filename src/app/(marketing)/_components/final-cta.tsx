import { Otto } from "@/components/mascot/otto";
import { PAGE_CTA_ATTRIBUTE } from "@/components/site/page-cta";
import { cn } from "@/lib/utils";
import { PrimaryCta } from "./primary-cta";
import { SECTION_TITLE_CLASSES } from "./section";

export function FinalCta() {
  return (
    <section aria-labelledby="final-cta-title" className="py-24 sm:py-32">
      <div className="container-page">
        <div
          {...{ [PAGE_CTA_ATTRIBUTE]: "" }}
          className="flex flex-col items-center rounded-3xl bg-surface-muted px-6 py-16 text-center sm:py-24"
        >
          <Otto
            pose="read"
            size={144}
            title="Otto the otter, reading a resume"
            className="size-28 sm:size-36"
          />
          <h2 id="final-cta-title" className={cn("mt-8", SECTION_TITLE_CLASSES)}>
            See what the software sees.
          </h2>
          <PrimaryCta className="mt-8" />
          <p className="mt-3 text-sm text-subtle">
            Checking and PDFs are free. Pro and Max add more help from Otto.
          </p>
        </div>
      </div>
    </section>
  );
}
