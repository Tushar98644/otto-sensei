"use client";

import { ChevronDown, PenLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { ROUTES } from "@/components/site/routes";
import { useNow } from "@/components/studio/use-now";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { api, isApiError } from "@/lib/api/client";
import type { SharedLink } from "@/lib/share/types";
import { cn } from "@/lib/utils";
import { viewFacts } from "./share-facts";
import { ShareOptions, type ShareOptionValues } from "./share-options";
import { dropShare, putShare, useShares } from "./share-store";

// The studio opens on whatever resume is active, so the saved studio is loaded and pointed at this one first.
async function openInStudio(resumeId: string): Promise<boolean> {
  const { flushStudio, useStudioStore } = await import("@/lib/store/resume-store");
  if (!useStudioStore.persist.hasHydrated()) await useStudioStore.persist.rehydrate();
  const studio = useStudioStore.getState();
  if (!studio.resumes[resumeId]) return false;
  if (studio.activeId !== resumeId) studio.setActive(resumeId);
  studio.setStep("fix");
  flushStudio();
  return true;
}

export function ShareOwnerBar({ slug }: { slug: string }) {
  const { status, links } = useShares();
  const link = links.find((item) => item.slug === slug) ?? null;
  if (link) return <Bar link={link} />;
  return status === "loading" ? <Skeleton className="h-16 rounded-2xl" /> : null;
}

function Bar({ link }: { link: SharedLink }) {
  const router = useRouter();
  const now = useNow();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState(false);

  async function change(patch: Partial<ShareOptionValues>) {
    setBusy(true);
    putShare({ ...link, ...patch });
    try {
      putShare((await api.updateShare(link.id, patch)).link);
      router.refresh();
    } catch (error) {
      if (isApiError(error, "not_found")) dropShare(link.id);
      else putShare(link);
      toast({
        title: "Couldn't save that",
        description: isApiError(error) ? error.message : "Check your connection, then try again.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  async function edit() {
    setOpening(true);
    const found = await openInStudio(link.resumeId).catch(() => false);
    router.push(found ? ROUTES.studio : ROUTES.dashboardResumes);
  }

  return (
    <section aria-label="Your link" className="rounded-2xl bg-surface px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm/5 font-medium text-ink">Only you see this bar</p>
          <p className="text-sm/5 text-subtle">{now > 0 ? viewFacts(link, now) : " "}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
          >
            Link settings
            <ChevronDown
              aria-hidden
              className={cn("motion-safe:transition-transform", open && "rotate-180")}
            />
          </Button>
          <Button variant="secondary" size="sm" loading={opening} onClick={() => void edit()}>
            <PenLine aria-hidden />
            Edit
          </Button>
        </div>
      </div>
      <div id={panelId} hidden={!open} className="mt-3">
        <ShareOptions
          value={{ showContact: link.showContact, allowIndexing: link.allowIndexing }}
          onChange={(patch) => void change(patch)}
          disabled={busy}
        />
      </div>
    </section>
  );
}
