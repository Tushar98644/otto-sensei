import { Squiggle } from "@/components/doodles/doodles";
import { Eyebrow } from "@/components/ui/eyebrow";
import { HeroDemo } from "./hero-demo";
import { PrimaryCta } from "./primary-cta";

// Most visitors arrive on a phone from a social post. Copy and the call to action come first, then
// the product itself: your resume next to what hiring software reads from it.
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="overflow-x-clip">
      {/* Tight enough at the top that the highlighted lines of the demo land on the first screen. */}
      <div className="container-page pt-12">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Eyebrow>Free resume checker</Eyebrow>
          {/* BRAND.tagline, set in two lines so the second gets the italic voice. */}
          <h1
            id="hero-title"
            className="mt-4 font-display text-5xl/none font-normal tracking-tight text-ink sm:text-7xl/none lg:text-8xl/none"
          >
            See your resume{" "}
            <em className="block">
              the way{" "}
              <span className="relative whitespace-nowrap">
                recruiters
                <Squiggle className="absolute inset-x-0 top-4/5 h-auto w-full" />
              </span>{" "}
              do.
            </em>
          </h1>
          {/* One sentence group per line on wider screens, so neither breaks mid-thought. */}
          <p className="mx-auto mt-8 max-w-2xl text-lg/7 text-balance text-muted sm:text-xl/8">
            <span className="sm:block">Upload your file and see what hiring software reads.</span>{" "}
            <span className="sm:block">Otto helps you fix weak lines. Downloads are free.</span>
          </p>
          <PrimaryCta className="mt-8" />
          <p className="mt-3 text-sm text-subtle">No signup needed.</p>
        </div>
        <HeroDemo className="mt-10" />
      </div>
    </section>
  );
}
