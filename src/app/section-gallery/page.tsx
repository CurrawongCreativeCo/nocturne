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
      <main className="mx-auto max-w-2xl px-6 py-24">
        <h1 className="text-2xl font-semibold">Section gallery</h1>
        <p className="mt-4 text-gray-700">
          The dataset has no page with the slug <code>{GALLERY_SEGMENT}</code>. Point the site at
          the fixture dataset to fill it (see “Section gallery” in the README).
        </p>
      </main>
    )
  }

  return (
    <main>
      {sections.map((section) => (
        // The _key is the section's id: tests/e2e/visual.spec.ts names its baseline after it.
        <div key={section._key} data-gallery-section={section._key}>
          <p className="bg-gray-900 px-6 py-2 text-sm font-medium text-white">
            {sectionLabel(section)}
          </p>
          {/* One renderer per section so each can be captured alone; only the hero reads isFirst. */}
          <SectionRenderer
            documentId={page?._id ?? GALLERY_SEGMENT}
            documentType="page"
            sections={[section]}
            {...renderers}
          />
        </div>
      ))}
    </main>
  )
}
