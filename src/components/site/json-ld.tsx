import { jsonLdScript, type JsonLdData } from "@/lib/seo/json-ld";

// Escaped so no value can close the script tag.
export function JsonLd({ data }: { data: JsonLdData }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(data) }} />
  );
}
