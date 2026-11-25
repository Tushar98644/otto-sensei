import { fmt, selectPlural } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { MessageValue, PluralForms } from "@/i18n/types";

// The form for count; English keeps its plain digits ("1043 words") as before, other languages group them.
export function countText(
  format: Format,
  forms: PluralForms,
  count: number,
  values?: Record<string, MessageValue>,
): string {
  if (format.locale !== "en") return format.plural(forms, count, values);
  return fmt(selectPlural("en", forms, count), { ...values, count });
}
