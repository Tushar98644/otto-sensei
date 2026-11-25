import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import type { Localize } from "@/i18n/pages";

export type HomeMessages = Messages["home"];

// What a home section reads: its words, numbers in the page's language and links to its published pages.
export type HomeProps = {
  t: HomeMessages;
  format: Format;
  href: Localize;
  // The mascot's name and the clips' buttons in the page's language; English when left out.
  common?: Pick<Messages["common"], "otto" | "video">;
};
