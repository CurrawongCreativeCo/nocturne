import Link from 'next/link'

import { siteProfile } from '@/config/profile'

/**
 * What the gate's 404 shows before launch. No navigation: the only way out is back to the
 * temporary page. The status is a real 404 (the gate rewrites here), so nothing is indexed.
 */
export default function PrelaunchNotFound() {
  return (
    <section className="mx-auto max-w-xl px-gutter py-section-spacious text-center">
      <p className="text-small font-semibold text-ink-muted">{siteProfile.client.name}</p>
      <h1 className="mt-2 text-h1 font-semibold">This page isn’t open yet</h1>
      <Link href="/" className="mt-6 inline-block underline">
        Go to the home page
      </Link>
    </section>
  )
}
