"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Menu, type MenuEntry } from "@/components/ui/menu";
import { LEVEL_NAMES, placeLabel, placeLine } from "@/lib/job-feed/looking-for";
import { familyOfOccupation } from "@/lib/job-feed/roles";
import {
  LOOKING_FOR_LIMITS,
  PLACE_GROUPS,
  ROLE_FAMILIES,
  ROLE_LABELS,
  SENIORITIES,
  type LookingFor,
  type LookingForChoice,
  type OccupationOption,
  type PlaceChoice,
  type RoleFamily,
} from "@/lib/job-feed/types";
import { OccupationSearch } from "./occupation-search";

export type CardRole = {
  title: string;
  family: RoleFamily | null;
  // The occupation the server read from the title; null until the first list arrives.
  occupation: OccupationOption | null;
};

export type LookingForCardProps = {
  value: LookingFor;
  // The occupation the list was ranked for, in plain words ("Registered Nurse").
  occupation: OccupationOption | null;
  choice: LookingForChoice;
  // The roles the resume names, newest first.
  roles: readonly CardRole[];
  // The work profile's country, offered as a place when it isn't one of the usual ones.
  country: string;
  saving: boolean;
  onChange: (next: LookingForChoice) => void;
};

const TRIGGER =
  "inline-flex items-center gap-0.5 rounded-lg px-1.5 py-0.5 font-medium text-ink underline decoration-ink/30 decoration-dotted underline-offset-4 transition-colors hover:bg-ink/5 pointer-coarse:py-1.5";

const COMMON_PLACES: readonly PlaceChoice[] = [
  "c:US",
  "c:CA",
  "c:GB",
  ...PLACE_GROUPS.map((group) => `g:${group}` as const),
];

function roleName(value: Pick<LookingFor, "title" | "family">, occupation: string | null): string {
  if (value.title) return value.title;
  if (occupation) return occupation;
  return value.family ? `Any ${ROLE_LABELS[value.family].toLowerCase()} role` : "Any role";
}

// The occupation in plain words when it says more than the title: "Staff Nurse" is read as
// "Registered Nurse", "Backend Engineer" as "Software Developer".
function occupationNote(title: string, occupation: OccupationOption | null): string | null {
  if (!occupation || occupation.name.toLowerCase() === title.toLowerCase()) return null;
  return occupation.name;
}

// "Looking for: Senior · Product Manager · Remote, EU", each part a one-tap menu. Guessed from the
// resume and the work profile; what's changed is kept for the account and ranks Matches.
export function LookingForCard({
  value,
  occupation,
  choice,
  roles,
  country,
  saving,
  onChange,
}: LookingForCardProps) {
  const [searching, setSearching] = useState(false);
  const levelItems: MenuEntry[] = [
    ...SENIORITIES.map((level) => ({
      label: LEVEL_NAMES[level],
      checked: value.level === level,
      onSelect: () => onChange({ ...choice, level }),
    })),
    ...(choice.level === null
      ? []
      : [
          "separator" as const,
          {
            label: "Go back to my resume's level",
            onSelect: () => onChange({ ...choice, level: null }),
          },
        ]),
  ];

  const roleItems: MenuEntry[] = [
    ...roles.map((role) => ({
      label: role.title,
      description: role.occupation?.name ?? (role.family ? ROLE_LABELS[role.family] : undefined),
      checked: value.title.toLowerCase() === role.title.toLowerCase(),
      onSelect: () =>
        onChange({
          ...choice,
          role: {
            title: role.title,
            family: role.family,
            occupation: role.occupation?.code ?? null,
          },
        }),
    })),
    ...(roles.length > 0 ? ["separator" as const] : []),
    {
      label: "Any other job…",
      description: "Search every kind of work by name",
      onSelect: () => setSearching(true),
    },
    "separator" as const,
    ...ROLE_FAMILIES.map((family) => ({
      label: `Any ${ROLE_LABELS[family].toLowerCase()} role`,
      checked: value.title === "" && value.family === family,
      onSelect: () => onChange({ ...choice, role: { title: "", family, occupation: null } }),
    })),
    ...(choice.role === null
      ? []
      : [
          "separator" as const,
          {
            label: "Go back to my latest job title",
            onSelect: () => onChange({ ...choice, role: null }),
          },
        ]),
  ];

  const role = roleName(value, occupation?.name ?? null);
  const note = value.title ? occupationNote(value.title, occupation) : null;

  const own: PlaceChoice | null =
    country && !COMMON_PLACES.includes(`c:${country}`) ? `c:${country}` : null;
  const places: PlaceChoice[] = [
    "anywhere",
    ...(own ? [own] : []),
    ...COMMON_PLACES,
    ...(value.place !== "anywhere" && value.place !== own && !COMMON_PLACES.includes(value.place)
      ? [value.place]
      : []),
  ];
  const placeItems: MenuEntry[] = [
    {
      label: "Remote only",
      checked: value.remote,
      onSelect: () => onChange({ ...choice, remote: true }),
    },
    {
      label: "Remote or on-site",
      checked: !value.remote,
      onSelect: () => onChange({ ...choice, remote: false }),
    },
    "separator",
    ...places.map((place) => ({
      label: place === "anywhere" ? "Anywhere" : placeLabel(place),
      checked: value.place === place,
      onSelect: () => onChange({ ...choice, place }),
    })),
    ...(choice.place === null
      ? []
      : [
          "separator" as const,
          {
            label: "Go back to my work profile's country",
            onSelect: () => onChange({ ...choice, place: null }),
          },
        ]),
  ];

  return (
    <section
      aria-label="What you're looking for"
      aria-busy={saving}
      className="flex flex-col gap-1 rounded-2xl bg-surface px-4 py-3 sm:px-6"
    >
      {/* A div, not a p: each Menu renders its popover panel as a div, which a p can't hold. */}
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm/6 text-muted">
        <span>Looking for:</span>
        <Menu
          label="Level"
          triggerLabel={`Level: ${value.level ? LEVEL_NAMES[value.level] : "any"}. Change it`}
          triggerClassName={TRIGGER}
          trigger={
            <>
              {value.level ? LEVEL_NAMES[value.level] : "Any level"}
              <ChevronDown aria-hidden className="size-3.5 text-subtle" />
            </>
          }
          items={levelItems}
        />
        <Menu
          label="Role"
          triggerLabel={`Role: ${role}${note ? `, read as ${note}` : ""}. Change it`}
          triggerClassName={TRIGGER}
          trigger={
            <>
              {role}
              {note ? <span className="font-normal text-muted">({note})</span> : null}
              <ChevronDown aria-hidden className="size-3.5 text-subtle" />
            </>
          }
          items={roleItems}
        />
        <span aria-hidden>·</span>
        <Menu
          label="Place"
          triggerLabel={`Place: ${placeLine(value)}. Change it`}
          triggerClassName={TRIGGER}
          trigger={
            <>
              {placeLine(value)}
              <ChevronDown aria-hidden className="size-3.5 text-subtle" />
            </>
          }
          items={placeItems}
        />
      </div>
      <p className="text-xs/5 text-subtle">
        Guessed from your resume and work profile. Matches are ordered for it; tap a part to change
        it. Job names from O*NET® and ESCO.
      </p>
      <OccupationSearch
        open={searching}
        onOpenChange={setSearching}
        onPick={(picked) =>
          onChange({
            ...choice,
            role: {
              title: picked.name.slice(0, LOOKING_FOR_LIMITS.titleChars),
              family: familyOfOccupation(picked.code),
              occupation: picked.code,
            },
          })
        }
      />
    </section>
  );
}
