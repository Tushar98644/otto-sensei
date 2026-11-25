"use client";

import { ArrowRight } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROUTES } from "@/components/site/routes";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/config/plans";
import { fmt } from "@/i18n/format";
import { formatFor, type Format } from "@/i18n/intl";
import matchCheckEn from "@/i18n/messages/en/match-check";
import type { MatchCheckMessages } from "@/lib/match-check/copy";
import type { StudioHandoff } from "./open-studio";

// The studio's store loads only on intent, so the page itself stays light.
const loadOpener = () => import("./open-studio");

// Mounts only once a Free account with a resume already saved hands over another one.
const UpgradeHost = dynamic(() =>
  import("@/components/account/upgrade-prompt").then((module) => module.UpgradePromptHost),
);

function opensWith(handoff: StudioHandoff, t: MatchCheckMessages["studio"]): string {
  if ("file" in handoff) return t.opens.file;
  return handoff.sample ? t.opens.sample : t.opens.pasted;
}

export function StudioCta({
  handoff,
  t = matchCheckEn,
  format = formatFor("en"),
}: {
  handoff: StudioHandoff;
  t?: MatchCheckMessages;
  format?: Format;
}) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const [upgrade, setUpgrade] = useState(false);
  const [failed, setFailed] = useState(false);
  const words = t.studio;

  function prepare() {
    router.prefetch(ROUTES.studio);
    void loadOpener().catch(() => undefined);
  }

  async function open() {
    setOpening(true);
    setFailed(false);
    try {
      const { openStudioWith } = await loadOpener();
      // "Replace it" in the prompt trashes the old resume and runs this again.
      if (await openStudioWith(handoff, () => void open())) {
        router.push(ROUTES.studio);
        return;
      }
      setUpgrade(true);
    } catch {
      setFailed(true);
    }
    setOpening(false);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-surface-muted p-4 sm:p-6">
      <p className="text-base/6 font-semibold text-ink">{words.title}</p>
      <p className="max-w-prose text-sm/6 text-muted">
        {fmt(words.body, {
          opens: opensWith(handoff, words),
          fixes: format.number(PLANS.free.limits.fix),
        })}
      </p>
      <Button
        loading={opening}
        className="self-start"
        onPointerEnter={prepare}
        onFocus={prepare}
        onClick={() => void open()}
      >
        {words.cta}
        <ArrowRight />
      </Button>
      {failed ? (
        <p role="alert" className="text-sm font-medium text-fail-ink">
          {words.failed}
        </p>
      ) : null}
      {upgrade ? <UpgradeHost /> : null}
    </div>
  );
}
