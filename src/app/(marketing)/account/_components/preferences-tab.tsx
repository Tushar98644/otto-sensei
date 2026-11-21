"use client";

import { WorkProfileCard } from "@/components/eligibility/work-profile-card";
import { ReminderSettingsCard } from "@/components/notifications/reminder-settings-card";
import { SettingsGroup } from "@/components/settings/settings-group";
import { WritingStyleCard } from "@/components/settings/writing-style-card";
import { LookingForSettingsCard } from "@/components/setup/looking-for-settings-card";
import { ACCOUNT_SECTIONS } from "@/components/setup/links";

// Each card opens with what it's for, so the group headings stay bare titles.
export function PreferencesTab() {
  return (
    <div className="flex flex-col gap-12">
      <SettingsGroup id={ACCOUNT_SECTIONS.writingStyle} title="Writing style">
        <WritingStyleCard />
      </SettingsGroup>
      <SettingsGroup id="job-search" title="Job search">
        <WorkProfileCard />
        <LookingForSettingsCard />
      </SettingsGroup>
      <SettingsGroup id="notifications" title="Notifications">
        <ReminderSettingsCard />
      </SettingsGroup>
    </div>
  );
}
