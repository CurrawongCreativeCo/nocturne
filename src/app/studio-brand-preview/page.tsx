import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { BrandPreview } from '@/features/studio/brand-preview/brand-preview'

export const metadata: Metadata = {
  title: 'Studio brand preview',
  robots: { index: false, follow: false },
}

/**
 * Sanity UI under each CMS brand theme, for the accessibility and visual tests (Studio needs a login,
 * so it can't be tested directly). Not part of the public site: it answers 404 unless NODE_ENV is
 * development or E2E_GALLERY=1, like /section-gallery, and the slug is reserved so no CMS page can
 * use it. The check runs when the page is prerendered, so a build without the variable has a real 404
 * (not a 200 that streams a not-found page); E2E_GALLERY must be set at build time, as for the tests.
 */
export default function StudioBrandPreviewPage() {
  if (process.env.NODE_ENV !== 'development' && process.env.E2E_GALLERY !== '1') notFound()
  return <BrandPreview />
}
