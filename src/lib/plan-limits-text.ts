import "server-only";
import { formatFor } from "@/i18n/intl";
import EN_OTTO from "@/i18n/messages/en/otto";
import { planFullCopy } from "./plan-limits-copy";

// The API's English limit message; apart from plan-limits-copy so the browser never loads Otto's English lines.
export const planFullText = planFullCopy(EN_OTTO.full, formatFor("en"));
