import { jsonLdScript, type JsonLdData } from "@/lib/seo/json-ld";

/** schema.org structured data for the page, escaped so no value can close the script tag. */
export function JsonLd({ data }: { data: JsonLdData }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(data) }} />
  );
}
