"use client";

import { Link2 } from "lucide-react";
import { useProTools } from "@/components/account/pro-tools";
import { useShareResume } from "@/components/share/use-share-resume";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Resume } from "@/lib/resume/schema";

// "Copy share link" beside the downloads, where people finish, not only in a card's menu. Share
// links are Pro: on Free the button carries the badge and opens the trial prompt.
export function ShareLinkButton({ resume }: { resume: Resume }) {
  const locked = useProTools() === false;
  const share = useShareResume(resume);
  return (
    <>
      <Button variant="outline" onClick={share.share} className="w-full">
        <Link2 />
        Copy share link
        {locked ? (
          <Badge variant="ink" className="h-5 px-1.5">
            Pro
          </Badge>
        ) : null}
      </Button>
      {share.dialog}
    </>
  );
}
