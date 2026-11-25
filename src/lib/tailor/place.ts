import { fmt } from "@/i18n/format";
import type studioTailorEn from "@/i18n/messages/en/studio-tailor";
import type { Translation } from "@/i18n/types";
import type { BulletRef } from "@/lib/resume/ops";

// Where a resume line sits, in the reader's language.
export type ResumePlaces = Translation<typeof studioTailorEn.reasons.places>;

type PlaceWords = Pick<ResumePlaces, "at" | "experience" | "project" | "education">;

// A bullet's job, project or school as listBullets labels it, in the reader's words.
export function refPlace(
  ref: Pick<BulletRef, "section" | "parentLabel" | "roleTitle" | "company">,
  places: PlaceWords,
): string {
  const named = [ref.roleTitle, ref.company].filter(Boolean);
  if (ref.section === "experience") {
    const [title = "", company] = named;
    return company ? fmt(places.at, { title, company }) : title || places.experience;
  }
  if (ref.section === "projects") return ref.roleTitle || places.project;
  if (ref.section === "education") return named.join(", ") || places.education;
  return ref.parentLabel;
}
