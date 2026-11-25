import type { APP_CHROME_NAMESPACES } from "@/i18n/app-namespaces";
import type { Messages } from "@/i18n/messages";
import app from "@/i18n/messages/en/app";
import otto from "@/i18n/messages/en/otto";
import signIn from "@/i18n/messages/en/sign-in";
import ui from "@/i18n/messages/en/ui";
import upgrade from "@/i18n/messages/en/upgrade";

// The account dialogs' words in English for pages without a provider; ./lazy-dialogs loads them with the dialog.
export const ENGLISH_CHROME: Pick<Messages, (typeof APP_CHROME_NAMESPACES)[number]> = {
  app,
  otto,
  signIn,
  ui,
  upgrade,
};
