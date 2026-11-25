import type { Namespace } from "@/i18n/messages";

// The owner bar and the download button read these; the rest of the page is drawn on the server.
export const SHARE_NAMESPACES = ["share"] as const satisfies readonly Namespace[];
