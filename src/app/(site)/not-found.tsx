import Link from 'next/link'

/** Its <title> comes from the catch-all route's metadata (getPageMetadata). */

export default function NotFound() {
  return (
    <section className="mx-auto max-w-xl px-gutter py-section-spacious text-center">
      <h1 className="text-h1 font-semibold">Page not found</h1>
      <Link href="/" className="mt-6 inline-block underline">
        Go home
      </Link>
    </section>
  )
}
