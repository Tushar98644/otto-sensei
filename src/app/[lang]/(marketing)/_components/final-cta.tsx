import { Otto } from "@/components/mascot/otto";
import { cn } from "@/lib/utils";
import type { HomeProps } from "./home-copy";
import { PrimaryCta } from "./primary-cta";
import { LAZY_SECTION, PAUSE_OFFSCREEN, SECTION_TITLE_CLASSES } from "./section";

export function FinalCta({ t }: Pick<HomeProps, "t">) {
  const words = t.finalCta;
  return (
    <section
      aria-labelledby="final-cta-title"
      data-lazy=""
      data-pause=""
      className={cn(
        "py-24 sm:py-32",
        LAZY_SECTION,
        PAUSE_OFFSCREEN,
        "[contain-intrinsic-size:auto_484px] sm:[contain-intrinsic-size:auto_532px]",
      )}
    >
      <div className="container-page">
        <div className="flex flex-col items-center rounded-3xl bg-surface-muted px-6 py-16 text-center sm:py-24">
          <Otto pose="read" size={144} title={words.otto} className="size-28 sm:size-36" />
          <h2 id="final-cta-title" className={cn("mt-8", SECTION_TITLE_CLASSES)}>
            {words.title}
          </h2>
          <PrimaryCta copy={t.cta} className="mt-8" />
          <p className="mt-3 text-sm text-subtle">{words.note}</p>
        </div>
      </div>
    </section>
  );
}
