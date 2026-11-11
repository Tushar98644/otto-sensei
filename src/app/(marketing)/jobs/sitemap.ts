import type { MetadataRoute } from "next";
import { ROUTES } from "@/components/site/routes";
import { getDb } from "@/db/client";
import { JOB_SITEMAP_PARTS, sitemapJobs } from "@/lib/job-feed/sitemap";
import { SITEMAP_MAX_URLS, sitemapFromDb } from "@/lib/seo/sitemap";
import { absoluteUrl } from "@/lib/seo/urls";

// /jobs/sitemap/0.xml to /jobs/sitemap/3.xml: the open jobs that have a page here, newest first.
// Rebuilt daily, the same rhythm as the ingest that changes them.
export const revalidate = 86400;

export function generateSitemaps(): { id: number }[] {
  return Array.from({ length: JOB_SITEMAP_PARTS }, (_, id) => ({ id }));
}

export default async function sitemap({
  id,
}: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const part = Number(await id);
  return sitemapFromDb(`jobs-${part}`, async () =>
    (await sitemapJobs(await getDb(), part, SITEMAP_MAX_URLS)).map((job) => ({
      url: absoluteUrl(`${ROUTES.jobs}/${job.id}`),
      lastModified: new Date(job.updatedAt),
    })),
  );
}
