import { defineQuery } from 'next-sanity'

import { servicePath } from '@/config/paths'
import { hasServices } from '@/config/profile'
import { siteUrl } from '@/config/site-url'
import { pageBuilderFragment } from '@/features/pages/api/sections'
import { SectionRenderer } from '@/features/pages/components/section-renderer'
import type { ServiceQuestion } from '@/features/services/utils/questions'
import { cachedSanityFetch, TAGS, type FetchMode } from '@/lib/sanity/live'

/**
 * The optional `sections` of a service, rendered below its standard template. The services feature
 * cannot import the page builder, so this route composes the two. Members-only sections are left
 * out (a service page has no members gate). It is a second cached read, issued only for a service
 * whose first read (`SERVICE_QUERY`) says it has sections, so a service without them costs nothing.
 */
export const SERVICE_SECTIONS_QUERY = defineQuery(/* groq */ `
  *[_type == "service" && slug.current == $slug][0] {
    _id,
    "sections": sections[access != "members"] { ${pageBuilderFragment} }[_type != "reference"]
  }
`)

export async function ServiceSections({
  slug,
  editable,
  questions,
  ...mode
}: {
  slug: string
  editable: boolean
  /** The service's own questions: they head the page's one FAQPage, ahead of any FAQ section's. */
  questions: ServiceQuestion[]
} & FetchMode) {
  if (!hasServices()) return null
  const { data } = await cachedSanityFetch({
    query: SERVICE_SECTIONS_QUERY,
    params: { slug },
    ...mode,
    tags: [
      TAGS.service,
      TAGS.page,
      TAGS.post,
      TAGS.sharedSection,
      TAGS.teamMember,
      TAGS.frame,
      TAGS.event,
      TAGS.eventCategory,
      TAGS.panel,
    ],
  })
  if (!data?.sections?.length) return null
  return (
    <SectionRenderer
      documentId={data._id}
      documentType="service"
      path="sections"
      sections={data.sections}
      editable={editable}
      pageUrl={new URL(servicePath(slug), siteUrl).toString()}
      leadingQuestions={questions}
      belowHeading
    />
  )
}
