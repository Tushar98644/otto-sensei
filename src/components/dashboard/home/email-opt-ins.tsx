"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useProTools } from "@/components/account/pro-tools";
import { useSessionUserId } from "@/components/account/session-user";
import {
  hasTailoredCopy,
  JobsEmailOptIn,
  jobsCardShows,
  ViewsEmailOptIn,
  viewsCardShows,
} from "@/components/notifications/email-opt-in";
import { useEmailChoices } from "@/components/notifications/use-email-choices";
import { useNotifications } from "@/components/notifications/use-notifications";
import { isViewKind } from "@/lib/notifications/types";
import { useAppQueryClient } from "@/lib/queries/client";
import { savedJobsQuery } from "@/lib/queries/options";
import type { Resume } from "@/lib/resume/schema";

type Pick = "views" | "jobs";

// At most one card on Home: a first view outranks the jobs email, and the pick holds until answered.
export function HomeEmailOptIns({ resumes }: { resumes: readonly Resume[] }) {
  const userId = useSessionUserId();
  const pro = useProTools();
  const client = useAppQueryClient();
  const saved = useQuery(
    { ...savedJobsQuery(userId ?? ""), enabled: pro === true && userId !== null },
    client,
  );
  const bell = useNotifications();
  const viewed = bell.status === "ready" && bell.items.some((item) => isViewKind(item.kind));
  const jobsMoment = hasTailoredCopy(resumes) || (saved.data?.length ?? 0) > 0;
  const { data } = useEmailChoices(userId, viewed || jobsMoment);
  const [pick, setPick] = useState<Pick | null>(null);

  const next: Pick | null =
    viewed && viewsCardShows(data) ? "views" : jobsMoment && jobsCardShows(data) ? "jobs" : null;
  if (pick === null && next !== null) setPick(next);
  const shown = pick ?? next;

  if (shown === "views") return <ViewsEmailOptIn userId={userId} moment />;
  if (shown === "jobs") return <JobsEmailOptIn userId={userId} moment />;
  return null;
}
