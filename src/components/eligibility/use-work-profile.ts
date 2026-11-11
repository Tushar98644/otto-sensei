"use client";

import { useQuery } from "@tanstack/react-query";
import { useMe } from "@/components/account/use-me";
import { api } from "@/lib/api/client";
import type { WorkProfile } from "@/lib/eligibility/profile";
import { NO_CHOICE, type LookingForChoice } from "@/lib/job-feed/types";
import { getQueryClient, useAppQueryClient } from "@/lib/queries/client";
import { queryKeys } from "@/lib/queries/keys";
import { workProfileQuery, type WorkProfileData } from "@/lib/queries/options";

export function storeWorkProfile(
  userId: string,
  profile: WorkProfile,
  updatedAt: number | null,
  lookingFor?: LookingForChoice,
) {
  const key = queryKeys.workProfile(userId);
  const client = getQueryClient();
  const kept = client.getQueryData<WorkProfileData>(key)?.lookingFor ?? NO_CHOICE;
  client.setQueryData<WorkProfileData>(key, {
    profile,
    updatedAt,
    lookingFor: lookingFor ?? kept,
  });
}

/** After the "Looking for" card saved: its remote choice is the profile's "Remote only" too. */
function storeLookingFor(userId: string, lookingFor: LookingForChoice) {
  getQueryClient().setQueryData<WorkProfileData>(queryKeys.workProfile(userId), (data) =>
    data
      ? { ...data, profile: { ...data.profile, remoteOnly: lookingFor.remote }, lookingFor }
      : data,
  );
}

/** Every reader sees it at once; it's put back if the save fails, which the caller reports. */
export async function saveLookingForChoice(userId: string, next: LookingForChoice): Promise<void> {
  const before =
    getQueryClient().getQueryData<WorkProfileData>(queryKeys.workProfile(userId))?.lookingFor ??
    NO_CHOICE;
  storeLookingFor(userId, next);
  try {
    const res = await api.saveLookingFor(next);
    storeLookingFor(userId, res.choice);
  } catch (error) {
    storeLookingFor(userId, before);
    throw error;
  }
}

export type WorkProfileState =
  | { status: "unknown" }
  | { status: "signed_out" }
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  // updatedAt null: signed in, but nothing saved yet.
  | {
      status: "ready";
      userId: string;
      profile: WorkProfile;
      updatedAt: number | null;
      lookingFor: LookingForChoice;
    };

export function useWorkProfile(): WorkProfileState {
  const { user, loading } = useMe();
  const userId = user?.id ?? null;
  const client = useAppQueryClient();
  const query = useQuery({ ...workProfileQuery(userId ?? ""), enabled: userId !== null }, client);

  if (loading) return { status: "unknown" };
  if (!userId) return { status: "signed_out" };
  if (query.data) return { status: "ready", userId, ...query.data };
  if (query.isError && query.fetchStatus === "idle") {
    return { status: "error", retry: () => void query.refetch() };
  }
  return { status: "loading" };
}
