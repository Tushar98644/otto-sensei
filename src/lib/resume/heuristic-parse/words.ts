export const TITLE_WORDS =
  /\b(?:engineer|developer|manager|designer|analyst|intern|lead|director|consultant|specialist|scientist|architect|officer|coordinator|associate|assistant|administrator|head|vp|vice president|president|founder|co-?founder|owner|partner|teacher|tutor|nurse|accountant|representative|technician|writer|editor|researcher|professor|lecturer|programmer|advisor|adviser|strategist|producer|marketer|recruiter|executive|supervisor|agent|clerk|chef|attorney|lawyer|paralegal|pharmacist|physician|therapist|trainee|apprentice|fellow|volunteer|instructor|coach|mentor|operator|planner|controller|auditor|economist|swe|sde|cto|ceo|cfo|coo)\b/i;

const NOT_A_PLACE = new RegExp(
  [
    TITLE_WORDS.source,
    /^(?:university|college|institute|school|academy)\s+of\b|\b(?:university|college|institute|school|academy|polytechnic)$/
      .source,
    /\b(?:inc|llc|ltd|limited|gmbh|corp|corporation|company|plc|technologies|labs|group|solutions|systems|software|consulting|partners|bank|agency|studios?|ventures|capital|holdings|foundation|hospital|media|networks|services)\b/
      .source,
    /\b(?:bachelors?|masters?|doctorate|diploma|degree|certificate)\b/.source,
  ].join("|"),
  "i",
);

const PLACE =
  "\\p{Lu}[\\p{L}.'-]*(?:\\s+(?:\\p{Lu}[\\p{L}.'-]*|de|da|do|del|la|le|of|upon|am|an))*";
const LOCATION = new RegExp(`^${PLACE},\\s*${PLACE}(?:,\\s*${PLACE})?(?:\\s+\\d{4,6})?$`, "u");

export function isLocation(value: string): boolean {
  if (/^(?:remote|hybrid|on-?site)\b/i.test(value)) return true;
  if (value.length > 50 || !LOCATION.test(value)) return false;
  return value
    .split(/,\s*/)
    .every((part) => part.split(/\s+/).length <= 3 && !NOT_A_PLACE.test(part));
}
