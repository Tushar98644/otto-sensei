import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { cache } from "react";
import { DownloadPdfButton } from "@/components/share/download-pdf-button";
import { ShareOwnerBarSlot } from "@/components/share/owner-bar-slot";
import { ResumeWeb } from "@/components/share/resume-web";
import { SharePageFrame } from "@/components/share/share-page-frame";
import { ShareUnavailable } from "@/components/share/share-unavailable";
import { BRAND } from "@/config/brand";
import { fmt } from "@/i18n/format";
import { getFormat, getMessages } from "@/i18n/server";
import { trackShareViewed } from "@/lib/analytics/retention";
import { currentUserIdHint, getCurrentUser } from "@/lib/auth/session";
import { log } from "@/lib/log";
import { noteShareView } from "@/lib/notifications/view-alerts";
import { ownerHomeLink } from "@/lib/referrals/records";
import { ipFromHeaders, openSharePage } from "@/lib/share/page";
import { readerKey, recordView } from "@/lib/share/records";
import { sharePath } from "@/lib/share/types";
import { countsAsView, isPrefetch } from "@/lib/share/visits";

export const viewport: Viewport = { themeColor: "#eef3ef" };

type Props = { params: Promise<{ slug: string }> };

const NO_INDEX: Metadata["robots"] = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: { index: false, follow: false },
};

// Metadata and the page share one lookup, so each request ticks the page limit once.
const loadPage = cache(async (slug: string) => openSharePage(slug, ipFromHeaders(await headers())));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadPage(slug);
  const { meta } = await getMessages("share");
  if (page.status !== "ok") return { title: { absolute: meta.shared }, robots: NO_INDEX };
  const { resume, allowIndexing } = page.share;
  const name = resume.basics.name.trim();
  const title = name ? fmt(meta.title, { name }) : meta.untitled;
  const description = resume.basics.headline.trim() || fmt(meta.description, { brand: BRAND.name });
  return {
    title: { absolute: title },
    description,
    robots: allowIndexing ? { index: true, follow: false } : NO_INDEX,
    alternates: allowIndexing ? { canonical: sharePath(slug) } : undefined,
    openGraph: { type: "profile", title, description, url: sharePath(slug) },
    twitter: { title, description },
  };
}

// Only decides whether a view counts, so the locally checked JWT is enough.
async function ownerIsReading(ownerId: string): Promise<boolean> {
  try {
    return (await currentUserIdHint()) === ownerId;
  } catch {
    return false;
  }
}

// The owner bar shows the link's stats and settings, so it waits for the live session, not the JWT alone.
async function ownerIsSignedIn(ownerId: string): Promise<boolean> {
  try {
    return (await getCurrentUser())?.id === ownerId;
  } catch {
    return false;
  }
}

const UPDATED = { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" } as const;

export default async function SharedResumePage({ params }: Props) {
  const { slug } = await params;
  const page = await loadPage(slug);
  if (page.status === "missing") notFound();
  if (page.status === "rate_limited") {
    return <ShareUnavailable reason="busy" retryAfterMs={page.retryAfterMs} />;
  }
  const { share } = page;
  const homeLink = ownerHomeLink(share.ownerId);

  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent");
  const owner = await ownerIsReading(share.ownerId);
  if (!owner && countsAsView({ userAgent, prefetch: isPrefetch(requestHeaders) })) {
    const reader = readerKey(ipFromHeaders(requestHeaders), userAgent ?? "");
    after(() =>
      recordView(share.id, reader)
        .then(async (counted) => {
          if (!counted) return;
          trackShareViewed(share.ownerId);
          await noteShareView(share.id, share.ownerId);
        })
        .catch((error: unknown) => {
          log.warn("share.view_not_counted", { shareId: share.id }, error);
        }),
    );
  }
  const ownerBar = owner && (await ownerIsSignedIn(share.ownerId));
  const words = await getMessages("share");
  const format = await getFormat();

  return (
    <SharePageFrame homeHref={await homeLink} madeWith={words.madeWith}>
      {ownerBar ? <ShareOwnerBarSlot ownerId={share.ownerId} slug={slug} /> : null}
      <div className="flex items-center justify-between gap-4">
        <p className="min-w-0 truncate text-sm/5 text-subtle">
          {fmt(words.updated, { date: format.date(share.resume.updatedAt, UPDATED) })}
        </p>
        <DownloadPdfButton resume={share.resume} />
      </div>
      <ResumeWeb
        resume={share.resume}
        className="rounded-2xl bg-surface px-5 py-8 shadow-page sm:px-12 sm:py-12"
      />
    </SharePageFrame>
  );
}
