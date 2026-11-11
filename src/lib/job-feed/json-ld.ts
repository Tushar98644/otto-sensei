import { SOURCE_INFO } from "./sources";
import type { EmploymentType, FeedJob } from "./types";

// Client-safe and pure. schema.org JobPosting for /jobs/:id, only for jobs whose source allows
// republishing (SOURCE_INFO[source].republish) and only while they're open. The post's own page
// stays the place to apply: directApply is false and the url points there.

const SCHEMA_TYPES: Record<EmploymentType, string> = {
  full_time: "FULL_TIME",
  part_time: "PART_TIME",
  contract: "CONTRACTOR",
  internship: "INTERN",
  temporary: "TEMPORARY",
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Plain text with "- " items and blank lines, back into the simple HTML the schema asks for.
export function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      if (lines.length > 0 && lines.every((line) => line.startsWith("- "))) {
        return `<ul>${lines.map((line) => `<li>${escapeHtml(line.slice(2))}</li>`).join("")}</ul>`;
      }
      return lines.length > 0 ? `<p>${lines.map(escapeHtml).join("<br>")}</p>` : "";
    })
    .join("");
}

export type JsonLdJob = FeedJob & { description: string; validThrough: number | null };

export function jobPostingJsonLd(job: JsonLdJob): Record<string, unknown> | null {
  if (!SOURCE_INFO[job.source].republish || job.closed || !job.description.trim()) return null;
  const place = job.location.replace(/\bremote\b[\s,·-]*/gi, "").trim();
  return {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title,
    description: textToHtml(job.description),
    datePosted: new Date(job.postedAt).toISOString(),
    ...(job.validThrough ? { validThrough: new Date(job.validThrough).toISOString() } : {}),
    ...(job.employmentType ? { employmentType: SCHEMA_TYPES[job.employmentType] } : {}),
    hiringOrganization: { "@type": "Organization", name: job.company },
    // A remote job's place is where applicants may live; an office job's is where the office is.
    ...(job.remote
      ? {
          jobLocationType: "TELECOMMUTE",
          ...(place ? { applicantLocationRequirements: { "@type": "AdministrativeArea", name: place } } : {}),
        }
      : place
        ? { jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: place } } }
        : {}),
    directApply: false,
    url: job.url,
  };
}

export { jsonLdScript } from "@/lib/seo/json-ld";
