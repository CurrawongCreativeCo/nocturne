import { Fragment, type ComponentType } from 'react'

import { dataAttr } from '@/lib/sanity/data-attribute'

import type { PageSection, SectionProps, SectionType } from '../types'
import { CtaBanner } from './sections/cta-banner'
import { Faq } from './sections/faq'
import { FeaturesGrid } from './sections/features-grid'
import { Hero } from './sections/hero'
import { LogoCloud } from './sections/logo-cloud'
import { MediaText } from './sections/media-text'
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
}

export function SectionRenderer({
  documentId,
  documentType,
  sections,
  path = 'pageBuilder',
  editable = false,
}: Props) {
  if (!sections?.length) return null

  const Wrapper = editable ? 'div' : Fragment
  return (
    <Wrapper {...(editable && { 'data-sanity': dataAttr(documentId, documentType, path) })}>
      {sections.map((section) => {
        // TS can't correlate `section` with `SECTION_COMPONENTS[section._type]` across a
        // union; the registry's mapped type above already guarantees they match.
        const Section = SECTION_COMPONENTS[section._type] as
          ComponentType<{ data: PageSection }> | undefined

        if (!Section) {
          // Reachable when the dataset has a section type newer than this deployment.
          if (process.env.NODE_ENV !== 'production') {
            return <UnknownSection key={section._key} type={section._type} />
          }
          return null
        }

        return editable ? (
          <div
            key={section._key}
            data-sanity={dataAttr(documentId, documentType, `${path}[_key=="${section._key}"]`)}
          >
            <Section data={section} />
          </div>
        ) : (
          <Section key={section._key} data={section} />
        )
      })}
    </Wrapper>
  )
}

function UnknownSection({ type }: { type: string }) {
  return (
    <div className="mx-auto my-8 max-w-3xl rounded border border-dashed border-amber-500 bg-amber-50 p-6 text-center text-amber-900">
      No component registered for section <code>{type}</code>. Add it to{' '}
      <code>section-renderer.tsx</code>.
    </div>
  )
}
