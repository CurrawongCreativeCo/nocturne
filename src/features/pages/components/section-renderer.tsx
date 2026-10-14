import { Fragment, Suspense, type ComponentType, type ReactNode } from 'react'

import { isMembersOnly } from '@/lib/sanity/access'
import { dataAttr } from '@/lib/sanity/data-attribute'

import type { PageSection, SectionGate, SectionProps, SectionType } from '../types'
import { CtaBanner } from './sections/cta-banner'
import { Faq } from './sections/faq'
import { FeaturesGrid } from './sections/features-grid'
import { FormSection } from './sections/form-section'
import { Hero } from './sections/hero'
import { LogoCloud } from './sections/logo-cloud'
import { MediaText } from './sections/media-text'
import { NewsletterSignup } from './sections/newsletter-signup'
import { PricingTable } from './sections/pricing-table'
import { RichText } from './sections/rich-text'
import { Testimonials } from './sections/testimonials'
// new-section:import

/**
 * `_type` -> component registry. The mapped type is exhaustive: when TypeGen adds
 * a section to the `PageSection` union, this object fails to compile until the
 * new component is registered. Each entry is also checked against its own slice.
 */
const SECTION_COMPONENTS: { [K in SectionType]: ComponentType<SectionProps<K>> } = {
  hero: Hero,
  richText: RichText,
  mediaText: MediaText,
  featuresGrid: FeaturesGrid,
  logoCloud: LogoCloud,
  testimonials: Testimonials,
  faq: Faq,
  ctaBanner: CtaBanner,
  formSection: FormSection,
  pricingTable: PricingTable,
  newsletterSignup: NewsletterSignup,
  // new-section:register
}

interface Props {
  /** Parent document, for Visual Editing overlays and drag-to-reorder. */
  documentId: string
  documentType: string
  sections: PageSection[] | null | undefined
  /** Field name holding the array on the parent document. */
  path?: string
  /**
   * Adds Visual Editing overlay attributes. Only true in draft mode: the public site
   * shouldn't ship Studio URLs and document paths it never uses.
   */
  editable?: boolean
  /** Passed to every section; see `SectionProps.greeting`. */
  greeting?: ReactNode
  /** Passed to every section; see `SectionProps.renderForm`. */
  renderForm?: SectionProps<SectionType>['renderForm']
  /** Passed to every section; see `SectionProps.renderCheckout`. */
  renderCheckout?: SectionProps<SectionType>['renderCheckout']
  renderNewsletter?: SectionProps<SectionType>['renderNewsletter']
  /**
   * Set on public views: members-only sections arrive as stubs and are rendered here behind the
   * gate. Leave it out where every section holds its content (draft mode, or inside a page that
   * has already been unlocked).
   */
  gate?: SectionGate
}

export function SectionRenderer({
  documentId,
  documentType,
  sections,
  path = 'pageBuilder',
  editable = false,
  greeting,
  renderForm,
  renderCheckout,
  renderNewsletter,
  gate,
}: Props) {
  if (!sections?.length) return null

  const Wrapper = editable ? 'div' : Fragment
  return (
    <Wrapper {...(editable && { 'data-sanity': dataAttr(documentId, documentType, path) })}>
      {sections.map((section, index) => {
        // TS can't correlate `section` with `SECTION_COMPONENTS[section._type]` across a
        // union; the registry's mapped type above already guarantees they match.
        const Section = SECTION_COMPONENTS[section._type] as
          | ComponentType<{
              data: PageSection
              isFirst?: boolean
              greeting?: ReactNode
              renderForm?: Props['renderForm']
              renderCheckout?: Props['renderCheckout']
              renderNewsletter?: Props['renderNewsletter']
            }>
          | undefined

        if (!Section) {
          // Reachable when the dataset has a section type newer than this deployment.
          if (process.env.NODE_ENV !== 'production') {
            return <UnknownSection key={section._key} type={section._type} />
          }
          return null
        }

        // A locked section is a stub. Its content is fetched only once the gate has seen a session,
        // inside <Suspense> because the gate reads the visitor's cookies.
        const content =
          gate && isMembersOnly(section.access) ? (
            <Suspense fallback={null}>
              {gate.render({
                callbackUrl: gate.callbackUrl,
                headingLevel: 2,
                content: async () => {
                  const full = await gate.load(section._key)
                  // Not the first section of the page, so it never claims the <h1> or the LCP preload.
                  return full ? (
                    <Section
                      data={full}
                      greeting={greeting}
                      renderForm={renderForm}
                      renderCheckout={renderCheckout}
                      renderNewsletter={renderNewsletter}
                    />
                  ) : null
                },
              })}
            </Suspense>
          ) : (
            <Section
              data={section}
              isFirst={index === 0}
              greeting={greeting}
              renderForm={renderForm}
              renderCheckout={renderCheckout}
              renderNewsletter={renderNewsletter}
            />
          )

        // A shared section's overlay opens the shared document, since that is what an edit changes.
        return editable ? (
          <div
            key={section._key}
            data-sanity={
              'sharedSectionId' in section
                ? dataAttr(section.sharedSectionId, 'sharedSection', 'section')
                : dataAttr(documentId, documentType, `${path}[_key=="${section._key}"]`)
            }
          >
            {content}
          </div>
        ) : (
          <Fragment key={section._key}>{content}</Fragment>
        )
      })}
    </Wrapper>
  )
}

function UnknownSection({ type }: { type: string }) {
  return (
    <div className="mx-auto my-8 max-w-measure rounded-sm border border-dashed border-warning bg-warning-surface p-6 text-center text-warning-ink">
      No component registered for section <code>{type}</code>. Add it to{' '}
      <code>section-renderer.tsx</code>.
    </div>
  )
}
