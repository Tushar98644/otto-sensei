import type { Namespace } from "./messages";

// What any signed-in screen can open: Otto's working and limit lines, and the sign-in, upgrade and add-credit dialogs.
export const APP_CHROME_NAMESPACES = [
  "app",
  "signIn",
  "otto",
  "upgrade",
  "ui",
] as const satisfies readonly Namespace[];
