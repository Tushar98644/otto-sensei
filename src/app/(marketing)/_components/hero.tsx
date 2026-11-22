import { Squiggle } from "@/components/doodles/doodles";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";
import { displayItalic } from "./display-italic";
import { HeroCta } from "./hero-cta";
import { HeroDemo } from "./hero-demo";
import { PAUSE_OFFSCREEN } from "./section";

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      data-pause=""
      className={cn("overflow-x-clip", PAUSE_OFFSCREEN)}
    >
      <div className="container-page pt-12">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Eyebrow>Free resume checker</Eyebrow>
          <h1
            id="hero-title"
            className="mt-4 font-display text-5xl/none font-normal tracking-tight text-ink sm:text-7xl/none lg:text-8xl/none"
          >
            See your resume{" "}
            <em className={cn("block", displayItalic.className)}>
              the way{" "}
              <span className="relative whitespace-nowrap">
                recruiters
                <Squiggle className="absolute inset-x-0 top-4/5 h-auto w-full" />
              </span>{" "}
              do.
            </em>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg/7 text-balance text-muted sm:text-xl/8">
            <span className="sm:block">Upload your file and see what hiring software reads.</span>{" "}
            <span className="sm:block">Otto helps you fix weak lines. Downloads are free.</span>
          </p>
          <HeroCta />
        </div>
        <HeroDemo className="mt-10" />
      </div>
    </section>
  );
}
