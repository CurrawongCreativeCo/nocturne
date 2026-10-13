/** Renders schema.org structured data as a JSON-LD script. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Escaping "<" keeps editor content from closing the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
