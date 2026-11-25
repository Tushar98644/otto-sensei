import Link from "next/link";
import { Otto } from "@/components/mascot/otto";
import { ROUTES } from "@/components/site/routes";
import { buttonClasses } from "@/components/ui/button";
import { getFormat, getMessages } from "@/i18n/server";
import { SharePageFrame } from "./share-page-frame";

export type ShareUnavailableProps =
  { reason: "missing" } | { reason: "busy"; retryAfterMs: number };

// Off, mistyped and missing links look the same, so a guess can't find a turned-off link; outside [lang] (/p) it reads in English.
export async function ShareUnavailable(props: ShareUnavailableProps) {
  const busy = props.reason === "busy";
  const words = await getMessages("share");
  const format = await getFormat();
  const copy = words.unavailable;
  return (
    <SharePageFrame madeWith={words.madeWith}>
      <section className="flex flex-col items-center rounded-3xl bg-surface px-6 py-14 text-center sm:py-20">
        <Otto
          pose={busy ? "think" : "worried"}
          size={128}
          title={busy ? copy.thinking : copy.worried}
          className="size-28 sm:size-32"
        />
        <h1 className="mt-6 font-sans text-lg/7 font-medium text-ink">
          {busy ? copy.busyTitle : copy.missingTitle}
        </h1>
        <p className="mt-2 max-w-sm text-sm/6 text-muted">
          {busy
            ? format.plural(copy.busy, Math.max(1, Math.ceil(props.retryAfterMs / 60_000)))
            : copy.missing}
        </p>
        {busy ? null : (
          <Link
            href={ROUTES.studio}
            className={buttonClasses({ variant: "secondary", className: "mt-6" })}
          >
            {copy.checkOwn}
          </Link>
        )}
      </section>
    </SharePageFrame>
  );
}
