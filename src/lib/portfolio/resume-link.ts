import { sharePath } from "@/lib/share/types";

export type LinkableShare = { slug: string; showContact: boolean; email: string; phone: string };

export type PageContact = { showEmail: boolean; showPhone: boolean };

// The link never hands visitors an email or phone the page itself keeps off.
export function resumeHrefFor(share: LinkableShare | null, page: PageContact): string | null {
  if (!share) return null;
  const reveals =
    share.showContact &&
    ((share.email !== "" && !page.showEmail) || (share.phone !== "" && !page.showPhone));
  return reveals ? null : sharePath(share.slug);
}
