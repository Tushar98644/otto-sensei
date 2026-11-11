import Link from "next/link";
import { Otto } from "@/components/mascot/otto";
import { ROUTES } from "@/components/site/routes";
import { buttonClasses } from "@/components/ui/button";
import { SharePageFrame } from "./share-page-frame";

export type ShareUnavailableProps = { reason: "missing" } | { reason: "busy"; wait: string };

// Off, mistyped and missing links look the same, so a guess can't find a turned-off link.
export function ShareUnavailable(props: ShareUnavailableProps) {
  const busy = props.reason === "busy";
  return (
    <SharePageFrame>
      <section className="flex flex-col items-center rounded-3xl bg-surface px-6 py-14 text-center sm:py-20">
        <Otto
          pose={busy ? "think" : "worried"}
          size={128}
          title={busy ? "Otto the otter, thinking" : "Otto the otter, looking worried"}
          className="size-28 sm:size-32"
        />
        <h1 className="mt-6 font-sans text-lg/7 font-medium text-ink">
          {busy ? "Lots of pages opened at once" : "This link doesn't work"}
        </h1>
        <p className="mt-2 max-w-sm text-sm/6 text-muted">
          {busy
            ? `Many resumes were opened from your network just now. Try again in ${props.wait}.`
            : "The person who shared it may have turned it off. Ask them for a new link."}
        </p>
        {busy ? null : (
          <Link
            href={ROUTES.studio}
            className={buttonClasses({ variant: "secondary", className: "mt-6" })}
          >
            Check your own resume
          </Link>
        )}
      </section>
    </SharePageFrame>
  );
}
