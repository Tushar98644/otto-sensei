"use client";

import { CareerLogSettingsCard } from "@/components/career-log/career-log-settings-card";
import { WorkProfileCard } from "@/components/eligibility/work-profile-card";
import { ReminderSettingsCard } from "@/components/notifications/reminder-settings-card";
import { SettingsGroup } from "@/components/settings/settings-group";
import { WritingStyleCard } from "@/components/settings/writing-style-card";
import { LookingForSettingsCard } from "@/components/setup/looking-for-settings-card";
import { ACCOUNT_SECTIONS } from "@/components/setup/links";

export function PreferencesTab() {
  return (
    <div className="flex flex-col gap-10">
      <SettingsGroup
        id={ACCOUNT_SECTIONS.writingStyle}
        title="Writing style"
        description="Tone, length, spelling and sign-off for everything Otto writes for you."
      >
        <WritingStyleCard />
      </SettingsGroup>
      <SettingsGroup
        id="job-search"
        title="Job search"
        description="Where you can work and what you're looking for, so Jobs shows the right posts first."
      >
        <WorkProfileCard />
        <LookingForSettingsCard />
      </SettingsGroup>
      <SettingsGroup
        id="notifications"
        title="Reminders"
        description="Reminders to follow up on the jobs you apply to, in the bell, your interviews in your calendar, and your monthly career log."
      >
        <ReminderSettingsCard />
        <CareerLogSettingsCard />
      </SettingsGroup>
    </div>
  );
}
