import { JsonLd } from "@/components/site/json-ld";
import { appUrl } from "@/lib/env";
import { websiteJsonLd } from "@/lib/seo/json-ld";

export function WebsiteJsonLd() {
  return <JsonLd data={websiteJsonLd(appUrl())} />;
}
