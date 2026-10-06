import { jsonLdScript } from "@/lib/seo";

// Structured data (Schema.org) for search and answer engines. Rendered
// server-side into the HTML so crawlers see it without running JavaScript.
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(data)} />;
}
