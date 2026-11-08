import { BRAND } from "@/config/brand";
import { appUrl } from "@/lib/env";

// WebSite structured data lets search results show the brand name instead of the bare domain.
// Server-only: reads the app URL from the environment.
export function WebsiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND.name,
    url: `${appUrl()}/`,
    description: BRAND.description,
  };
  // Escaping "<" keeps any future value from closing the script tag early.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
