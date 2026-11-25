"use client";

import { ArrowRight } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ROUTES } from "@/components/site/routes";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

// The studio's store and the examples' data load only on intent, so the page itself stays light.
const loadOpener = () => import("./open-example");

// Mounts only when a Free account with a resume already saved asks for another.
const UpgradeHost = dynamic(() =>
  import("@/components/account/upgrade-prompt").then((module) => module.UpgradePromptHost),
);

export type StartFromExampleProps = {
  slug: string;
  role: string;
  // The button in the page's language, and which language's copy of the example opens.
  label?: string;
  locale?: Locale;
  className?: string;
};

export function StartFromExample({
  slug,
  role,
  label = "Start from this example",
  locale = "en",
  className,
}: StartFromExampleProps) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const [upgrade, setUpgrade] = useState(false);

  const prepare = useCallback(() => {
    router.prefetch(ROUTES.studio);
    void loadOpener().catch(() => undefined);
  }, [router]);

  async function open() {
    setOpening(true);
    try {
      const { openExampleInStudio } = await loadOpener();
      // Replacing the saved resume in the upgrade dialog opens the example after all.
      if (await openExampleInStudio(slug, () => void open(), locale)) {
        router.push(ROUTES.studio);
        return;
      }
      setUpgrade(true);
      setOpening(false);
    } catch {
      window.location.assign(ROUTES.studio);
    }
  }

  return (
    <>
      <Button
        size="lg"
        loading={opening}
        className={cn("w-full sm:w-auto", className)}
        onPointerEnter={prepare}
        onFocus={prepare}
        onClick={() => void open()}
      >
        {label}
        <span className="sr-only">: {role}</span>
        <ArrowRight />
      </Button>
      {upgrade ? <UpgradeHost /> : null}
    </>
  );
}
