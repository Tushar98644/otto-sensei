import { JsonLd } from "@/components/site/json-ld";
import { appUrl } from "@/lib/env";
import { websiteJsonLd } from "@/lib/seo/json-ld";

// WebSite and Organization data let search results show the brand name and logo instead of the
// bare domain. Server-only: reads the app URL from the environment.
export function WebsiteJsonLd() {
  return <JsonLd data={websiteJsonLd(appUrl())} />;
}
