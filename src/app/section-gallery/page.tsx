import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ComponentProps } from 'react'

import { GALLERY_SEGMENT } from '@/config/paths'
import { FormView } from '@/features/forms/components/form-view'
import { NewsletterView } from '@/features/forms/components/newsletter-view'
import { getPage } from '@/features/pages/api/get-page'
import { SectionRenderer } from '@/features/pages/components/section-renderer'
import { sectionLabel } from '@/features/pages/utils/section-label'
import { CheckoutButton } from '@/features/pricing/components/checkout-button'
import { DesignStyle } from '@/features/site/components/design-style'
import { PUBLISHED } from '@/lib/sanity/live'

export const metadata: Metadata = {
  title: 'Section gallery',
  robots: { index: false, follow: false },
}

type Renderers = Pick<
  ComponentProps<typeof SectionRenderer>,
  'renderForm' | 'renderCheckout' | 'renderNewsletter'
>

/** Forms, signup and checkout are their own features; like the page route, this route composes them. */
const renderers: Renderers = {
  renderForm: (form, headingId) => <FormView form={form} headingId={headingId} />,
  renderNewsletter: (request) => <NewsletterView {...request} />,
  renderCheckout: (request) => <CheckoutButton {...request} />,
}

/**
 * Every section type and variant on one page, each under a label, for the visual regression
 * tests (tests/e2e/visual.spec.ts) and for eyeballing a styling change. It renders the page with
 * the slug `section-gallery`, which the end-to-end fixture dataset provides (see the README's
 * "Section gallery"). Not part of the public site: it answers 404 unless NODE_ENV is development
 * or E2E_GALLERY=1, and the slug is reserved so no CMS page can use it.
 */
export default async function SectionGalleryPage() {
  if (process.env.NODE_ENV !== 'development' && process.env.E2E_GALLERY !== '1') notFound()

  const page = await getPage({ slug: GALLERY_SEGMENT, members: false, ...PUBLISHED })
  const sections = page?.pageBuilder ?? []

  if (sections.length === 0) {
    return (
      <main className="mx-auto max-w-measure-narrow px-gutter py-section">
        <h1 className="text-h3 font-semibold">Section gallery</h1>
        <p className="mt-4 text-ink-muted">
          The dataset has no page with the slug <code>{GALLERY_SEGMENT}</code>. Point the site at
          the fixture dataset to fill it (see “Section gallery” in the README).
        </p>
      </main>
    )
  }

  // A section whose key ends in `--below` is drawn in the same frame as the one before it, so a
  // section divider is shown together with the section it cuts into (see the edge entries).
  const groups: { section: (typeof sections)[number]; below: typeof sections }[] = []
  for (const section of sections) {
    const previous = groups[groups.length - 1]
    if (section._key.endsWith('--below') && previous) previous.below.push(section)
    else groups.push({ section, below: [] })
  }

  return (
    <main>
      {/* The public site gets this from SiteShell; the gallery shows the same Studio brand colours. */}
      <DesignStyle {...PUBLISHED} />
      {groups.map(({ section, below }) => (
        // The _key is the section's id: tests/e2e/visual.spec.ts names its baseline after it.
        <div key={section._key} data-gallery-section={section._key}>
          <p className="bg-surface-inverse px-gutter py-2 text-small font-medium text-ink-inverse">
            {sectionLabel(section)}
          </p>
          {/* One renderer per group so each can be captured alone; only the hero reads isFirst. */}
          <SectionRenderer
            documentId={page?._id ?? GALLERY_SEGMENT}
            documentType="page"
            sections={[section, ...below]}
            {...renderers}
          />
        </div>
      ))}
    </main>
  )
}
