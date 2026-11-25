import type { Metadata } from "next";
import type { Messages } from "@/i18n/messages";
import { getMessages } from "@/i18n/server";

type PageKey = Exclude<keyof Messages["dashboard"]["meta"], "title" | "titleTemplate">;

// A dashboard page's <title> in the reader's language; the layout adds "· Dashboard".
export async function pageTitle(key: PageKey): Promise<Metadata> {
  return { title: (await getMessages("dashboard")).meta[key] };
}
