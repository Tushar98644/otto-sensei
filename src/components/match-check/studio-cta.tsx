"use client";

import { ArrowRight } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROUTES } from "@/components/site/routes";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/config/plans";
import type { StudioHandoff } from "./open-studio";

// The studio's store loads only on intent, so the page itself stays light.
const loadOpener = () => import("./open-studio");

// Mounts only once a Free account with a resume already saved hands over another one.
const UpgradeHost = dynamic(() =>
  import("@/components/account/upgrade-prompt").then((module) => module.UpgradePromptHost),
);

function opensWith(handoff: StudioHandoff): string {
  if ("file" in handoff) return "The free studio reads your file";
  return handoff.sample
    ? "The free studio opens with the sample resume"
    : "The free studio opens with the resume you pasted";
}

function handoffLine(handoff: StudioHandoff): string {
  return `${opensWith(handoff)} and keeps this job post for Tailor.`;
}

export function StudioCta({ handoff }: { handoff: StudioHandoff }) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const [upgrade, setUpgrade] = useState(false);
  const [failed, setFailed] = useState(false);

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
      <p className="text-base/6 font-semibold text-ink">Take both to the studio</p>
      <p className="max-w-prose text-sm/6 text-muted">
        {handoffLine(handoff)} Fix lines by hand or with Otto ({PLANS.free.limits.fix} line fixes a
        month free) and download a clean PDF. On Pro, Otto tailors your resume to this job.
      </p>
      <Button
        loading={opening}
        className="self-start"
        onPointerEnter={prepare}
        onFocus={prepare}
        onClick={() => void open()}
      >
        Fix these lines with Otto
        <ArrowRight />
      </Button>
      {failed ? (
        <p role="alert" className="text-sm font-medium text-fail-ink">
          The studio didn&apos;t open. Check your connection, then try again.
        </p>
      ) : null}
      {upgrade ? <UpgradeHost /> : null}
    </div>
  );
}
