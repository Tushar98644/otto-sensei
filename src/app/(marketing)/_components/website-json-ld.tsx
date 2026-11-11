import { JsonLd } from "@/components/site/json-ld";
import { appUrl } from "@/lib/env";
import { websiteJsonLd } from "@/lib/seo/json-ld";

// Lets search results show the brand name and logo instead of the bare domain.
export function WebsiteJsonLd() {
  return <JsonLd data={websiteJsonLd(appUrl())} />;
}
