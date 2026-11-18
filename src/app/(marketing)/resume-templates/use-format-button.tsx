"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { UpgradePromptHost } from "@/components/account/upgrade-prompt";
import { ROUTES } from "@/components/site/routes";
import { Button } from "@/components/ui/button";
import type { TemplateId } from "@/lib/resume/schema";

const loadOpener = () => import("./open-format");

// The upgrade dialog mounts only once a Pro format is refused, so the gallery downloads none of it before.
let upgradeWanted = false;
const upgradeListeners = new Set<() => void>();

function wantUpgrade() {
  if (upgradeWanted) return;
  upgradeWanted = true;
  for (const listener of upgradeListeners) listener();
}

function subscribeUpgrade(listener: () => void) {
  upgradeListeners.add(listener);
  return () => {
    upgradeListeners.delete(listener);
  };
}

export function FormatUpgradeHost() {
  const wanted = useSyncExternalStore(
    subscribeUpgrade,
    () => upgradeWanted,
    () => false,
  );
  return wanted ? <UpgradePromptHost /> : null;
}

export type UseFormatButtonProps = {
  id: TemplateId;
  name: string;
};

// The studio's store loads only on intent, so the gallery itself stays light.
export function UseFormatButton({ id, name }: UseFormatButtonProps) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);

  function prepare() {
    router.prefetch(ROUTES.studio);
    void loadOpener().catch(() => undefined);
  }

  async function open() {
    setOpening(true);
    try {
      const { openFormatInStudio } = await loadOpener();
      if (await openFormatInStudio(id)) {
        router.push(ROUTES.studio);
        return;
      }
      wantUpgrade();
      setOpening(false);
    } catch {
      window.location.assign(ROUTES.studio);
    }
  }

  return (
    <Button
      size="sm"
      loading={opening}
      className="self-start"
      onPointerEnter={prepare}
      onFocus={prepare}
      onClick={() => void open()}
    >
      Use this format
      <span className="sr-only">: {name}</span>
      <ArrowRight />
    </Button>
  );
}
