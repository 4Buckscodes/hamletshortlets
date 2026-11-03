import { serializeJsonLd } from '@/lib/structured-data';

export interface JsonLdProps {
  data: Record<string, unknown>;
  id?: string;
}

/**
 * Reusable Next.js Server Component that safely emits a Schema.org JSON-LD `<script>` tag.
 */
export function JsonLd({ data, id }: JsonLdProps) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
