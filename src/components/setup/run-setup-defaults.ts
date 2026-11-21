import { storeWorkProfile } from "@/components/eligibility/use-work-profile";
import { deviceTimeZone } from "@/lib/eligibility/options";
import { getQueryClient } from "@/lib/queries/client";
import { queryKeys } from "@/lib/queries/keys";
import type { WorkProfileData } from "@/lib/queries/options";
import type { Resume } from "@/lib/resume/schema";
import type { DefaultsDue } from "@/lib/setup/checklist";
import { plannedDefaults } from "@/lib/setup/defaults";
import { sendSetupDefaults } from "./use-account-setup";

const sent = new Set<string>();

export function runSetupDefaults(userId: string, due: DefaultsDue, own: readonly Resume[]): void {
  const body = plannedDefaults({ due, own, timeZone: deviceTimeZone(), now: Date.now() });
  if (!body) return;
  const key = [userId, body.place ? "place" : "", body.lookingFor ? "looking_for" : ""].join(":");
  if (sent.has(key)) return;
  sent.add(key);
  sendSetupDefaults(userId, body)
    .then((res) => {
      const cached = getQueryClient().getQueryData<WorkProfileData>(queryKeys.workProfile(userId));
      // A save the person made while this was on its way is newer than this reply.
      if (res.updatedAt === null || (cached?.updatedAt ?? -1) >= res.updatedAt) return;
      storeWorkProfile(userId, res.profile, res.updatedAt, res.lookingFor);
    })
    .catch(() => {});
}
