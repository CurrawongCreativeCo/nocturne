import type { Metadata } from 'next'
import { Suspense, type ComponentProps } from 'react'

import { GALLERY_SEGMENT } from '@/config/paths'
import { FormView } from '@/features/forms/components/form-view'
import { NewsletterView } from '@/features/forms/components/newsletter-view'
import { getPage } from '@/features/pages/api/get-page'
import { SectionRenderer } from '@/features/pages/components/section-renderer'
import { sectionLabel } from '@/features/pages/utils/section-label'
import {
  applySectionOverride,
  hasTone,
  TONE_CONTROL,
  variantControlFor,
} from '@/features/pages/utils/section-override'
import { CheckoutButton } from '@/features/pricing/components/checkout-button'
import { getLocationBusiness } from '@/features/site/api/get-location-business'
import { DesignStyle } from '@/features/site/components/design-style'
import { SectionControls } from '@/features/styleguide/components/section-controls'
import { StyleguideNav } from '@/features/styleguide/components/styleguide-nav'
import { WidthFrame } from '@/features/styleguide/components/width-frame'
import { parseState } from '@/features/styleguide/utils/styleguide-state'
import { PUBLISHED } from '@/lib/sanity/live'

import { requireStyleguide, requireStyleguideToken } from './guard'

export const metadata: Metadata = {
  title: 'Style guide: sections',
  robots: { index: false, follow: false },
}

type Props = PageProps<'/section-gallery'>

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
 * The style guide's sections view: every section type and variant on one page, each under a label,
 * for the visual regression tests (tests/e2e/visual.spec.ts), for eyeballing a styling change and
 * for design reviews with a client. It renders the page with the slug `section-gallery`, which the
 * end-to-end fixture dataset provides (see the README's "Style guide"). Above each section, links
 * switch its tone and layout; at the top, links preview every section at 375, 768 or 1280 px. The
 * choices live in the URL, and with none made the page is the plain gallery the tests screenshot.
 *
 * Not part of the public site (lib/styleguide-access.ts): it answers 404 in production, and on a
 * preview deployment unless `?preview=<STYLEGUIDE_PREVIEW_TOKEN>` matches. It is never indexed, and
 * the slug is reserved so no CMS page can use it.
 */
export default function SectionGalleryPage({ searchParams }: Props) {
  const access = requireStyleguide()
  return (
    <Suspense fallback={null}>
      <SectionGallery access={access} searchParams={searchParams} />
    </Suspense>
  )
}

async function SectionGallery({
  access,
  searchParams,
}: {
  access: Parameters<typeof requireStyleguideToken>[0]
  searchParams: Props['searchParams']
}) {
  await requireStyleguideToken(access, searchParams)
  const state = parseState(await searchParams)

  const page = await getPage({ slug: GALLERY_SEGMENT, members: false, ...PUBLISHED })
  const sections = page?.pageBuilder ?? []
  const business = await getLocationBusiness(PUBLISHED)

  if (sections.length === 0) {
    return (
      <main className="mx-auto max-w-measure-narrow px-gutter py-section">
        <h1 className="text-h3 font-semibold">Section gallery</h1>
        <p className="mt-4 text-ink-muted">
          The dataset has no page with the slug <code>{GALLERY_SEGMENT}</code>. Point the site at
          the fixture dataset to fill it (see “Style guide” in the README).
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
      <StyleguideNav view="sections" state={state} />
      {groups.map(({ section: authored, below }) => {
        const section = applySectionOverride(authored, {
          tone: state.tones[authored._key],
          variant: state.layouts[authored._key],
        })
        const label = sectionLabel(section)
        return (
          <div key={authored._key}>
            <SectionControls
              sectionKey={authored._key}
              label={label}
              state={state}
              tones={hasTone(authored) ? TONE_CONTROL : null}
              layouts={variantControlFor(authored._type)}
            />
            <WidthFrame width={state.width}>
              {/* The _key is the section's id: tests/e2e/visual.spec.ts names its baseline after it. */}
              <div data-gallery-section={authored._key}>
                <p className="bg-surface-inverse px-gutter py-2 text-small font-medium text-ink-inverse">
                  {label}
                </p>
                {/* One renderer per group so each can be captured alone; only the hero reads isFirst. */}
                <SectionRenderer
                  documentId={page?._id ?? GALLERY_SEGMENT}
                  documentType="page"
                  sections={[section, ...below]}
                  business={business}
                  {...renderers}
                />
              </div>
            </WidthFrame>
          </div>
        )
      })}
    </main>
  )
}
