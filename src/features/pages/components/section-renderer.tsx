import { Fragment, Suspense, type ComponentType, type CSSProperties, type ReactNode } from 'react'

import {
  edgeHeightIsCustom,
  edgeHeightStyle,
  type ResolvedEdge,
} from '@/components/ui/section-edges'
import { resolveEdge } from '@/components/ui/section-style'
import { isMembersOnly } from '@/lib/sanity/access'
import { dataAttr } from '@/lib/sanity/data-attribute'

import type { PageSection, SectionGate, SectionProps, SectionType } from '../types'
import { CtaBanner } from './sections/cta-banner'
import { Faq } from './sections/faq'
import { FeaturesGrid } from './sections/features-grid'
import { FormSection } from './sections/form-section'
import { Gallery } from './sections/gallery'
import { Hero } from './sections/hero'
import { Location } from './sections/location'
import { LogoCloud } from './sections/logo-cloud'
import { MediaText } from './sections/media-text'
import { NewsletterSignup } from './sections/newsletter-signup'
import { PricingTable } from './sections/pricing-table'
import { RichText } from './sections/rich-text'
import { Stats } from './sections/stats'
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
  stats: Stats,
  gallery: Gallery,
  location: Location,
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
  /** Passed to every section; see `SectionProps.business`. */
  business?: SectionProps<SectionType>['business']
  /**
   * Set on public views: members-only sections arrive as stubs and are rendered here behind the
   * gate. Leave it out where every section holds its content (draft mode, or inside a page that
   * has already been unlocked).
   */
  gate?: SectionGate
}

/** The stacking order of the first edge frame; each later one is a step lower (the header is z-40). */
const EDGE_Z_START = 30

/**
 * The bottom edge a section draws, or undefined. A locked members-only section is a stub with no
 * style, so it has none: its edge appears once it is unlocked, and the page cannot pull the section
 * after it up under a cut it doesn't know about.
 */
function edgeOf(
  section: PageSection | undefined,
  gate: SectionGate | undefined,
): ResolvedEdge | undefined {
  if (!section) return undefined
  if (gate && isMembersOnly(section.access)) return undefined
  return resolveEdge('style' in section ? section.style : undefined)
}

/**
 * What the section below an edge needs (section dividers): pulled up under the cut by the edge's
 * height, with the same height added to its top padding (globals.css, `[data-edge-above]`). The
 * attributes go on the element that wraps the section, so draft mode's editable `div` carries them
 * too and Presentation shows the same result.
 */
function followerProps(edge: ResolvedEdge | undefined): {
  'data-edge-above'?: string
  'data-edge-above-custom'?: string
  style?: CSSProperties
} {
  if (!edge) return {}
  return {
    'data-edge-above': '',
    'data-edge-above-custom': edgeHeightIsCustom(edge.height) ? '' : undefined,
    style: edgeHeightStyle(edge.height, '--edge-above'),
  }
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
  business,
  gate,
}: Props) {
  if (!sections?.length) return null

  // The footer follows the last section, so it takes the edge like a section would (a band of its colour).
  const lastEdge = edgeOf(sections[sections.length - 1], gate)

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
              business?: Props['business']
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
                      business={business}
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
              business={business}
            />
          )

        // The section above's edge, unless this one is a locked stub with no frame to pull up.
        const above =
          index > 0 && !(gate && isMembersOnly(section.access))
            ? edgeOf(sections[index - 1], gate)
            : undefined
        const follower = followerProps(above)
        // Each edge frame sits above every frame after it, so a later section's own cut (or plain
        // background) never paints over this one's. Capped so it stays below the sticky header.
        const own = edgeOf(section, gate)
        if (own)
          follower.style = {
            ...follower.style,
            '--edge-z': Math.max(1, EDGE_Z_START - index),
          } as CSSProperties

        // A shared section's overlay opens the shared document, since that is what an edit changes.
        if (editable) {
          return (
            <div
              key={section._key}
              data-sanity={
                'sharedSectionId' in section
                  ? dataAttr(section.sharedSectionId, 'sharedSection', 'section')
                  : dataAttr(documentId, documentType, `${path}[_key=="${section._key}"]`)
              }
              {...follower}
            >
              {content}
            </div>
          )
        }
        return above || own ? (
          <div key={section._key} {...follower}>
            {content}
          </div>
        ) : (
          <Fragment key={section._key}>{content}</Fragment>
        )
      })}
      {lastEdge ? (
        <div
          aria-hidden="true"
          data-edge-backdrop=""
          data-edge-above-custom={edgeHeightIsCustom(lastEdge.height) ? '' : undefined}
          style={edgeHeightStyle(lastEdge.height, '--edge-above')}
        />
      ) : null}
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
