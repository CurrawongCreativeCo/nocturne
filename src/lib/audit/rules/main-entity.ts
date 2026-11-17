import type { JsonLdNode } from '@/lib/json-ld-visibility'
import {
  articleId,
  eventId,
  locationId,
  personId,
  serviceId,
  webPageId,
} from '@/lib/structured-data/ids'

import { makeFinding, type Finding } from '../finding'
import type { AuditContext, PageSnapshot } from '../types'
import { pageNodes } from './json-ld'

interface Expected {
  id: string
  /** schema.org types the node may have; empty when it depends on the document (a branch's business type). */
  types: string[]
  /** Whether the page's WebPage is always `about` the entity (an event's is only when it has dates). */
  aboutAlways: boolean
}

/** The `@id` and type a document's page should carry as its main entity (E2 §3.3). */
function expectedEntity(type: string, documentId: string, origin: string): Expected | null {
  switch (type) {
    case 'service':
      return { id: serviceId(origin, documentId), types: ['Service'], aboutAlways: true }
    case 'teamMember':
      return { id: personId(origin, documentId), types: ['Person'], aboutAlways: true }
    case 'post':
      return { id: articleId(origin, documentId), types: ['Article'], aboutAlways: true }
    case 'event':
      return { id: eventId(origin, documentId), types: ['Event'], aboutAlways: false }
    case 'place':
      return { id: locationId(origin, documentId), types: [], aboutAlways: true }
    default:
      // An ordinary page has no main entity.
      return null
  }
}

const typesOf = (node: JsonLdNode): string[] => {
  const type = node['@type']
  return (Array.isArray(type) ? type : [type]).filter(
    (item): item is string => typeof item === 'string',
  )
}

const aboutIds = (node: JsonLdNode | undefined): string[] => {
  const about = node?.about
  return (Array.isArray(about) ? about : [about]).flatMap((item) =>
    typeof item === 'object' && item !== null && typeof (item as JsonLdNode)['@id'] === 'string'
      ? [(item as JsonLdNode)['@id'] as string]
      : [],
  )
}

/**
 * `sd.main-entity` (E2 §11 step 3): a service, article, person, event or location page should
 * describe that document's entity, under the id its document key gives it, and its WebPage should
 * be `about` it. Needs the page's document, so it says nothing when the audit could not read one.
 * An ordinary page has no main entity and is never reported.
 */
export function mainEntityFindings(page: PageSnapshot, context: AuditContext): Finding[] {
  const { content } = context
  if (page.error || page.status !== 200 || !content) return []
  const expected = expectedEntity(content.type, content.documentId, context.origin)
  if (!expected) return []
  const nodes = pageNodes(page)
  if (nodes.length === 0) return []

  const entity = nodes.find((node) => node['@id'] === expected.id)
  const webPage = nodes.find((node) => node['@id'] === webPageId(page.publicUrl))
  const isAbout = aboutIds(webPage).includes(expected.id)
  // A dated event is about the Event; an undated one makes no claim, and nothing is wrong.
  if (!entity && !isAbout && !expected.aboutAlways) return []

  const problems: string[] = []
  if (!entity) {
    problems.push(`no node with the @id ${expected.id}`)
  } else if (
    expected.types.length > 0 &&
    !typesOf(entity).some((t) => expected.types.includes(t))
  ) {
    problems.push(`${expected.id} has the type ${typesOf(entity).join('/') || 'none'}`)
  }
  if (webPage && !isAbout) problems.push(`the page’s WebPage is not about ${expected.id}`)
  if (problems.length === 0) return []

  return [
    makeFinding({
      ruleId: 'sd.main-entity',
      severity: 'warning',
      scope: {
        kind: 'page',
        url: page.url,
        documentId: content.documentId.replace(/^drafts\./, ''),
      },
      observed: {
        problems,
        entityIds: nodes
          .filter((node) => typeof node['@id'] === 'string')
          .map((node) => node['@id'])
          .slice(0, 10),
      },
      expected: {
        id: expected.id,
        ...(expected.types.length > 0 && { type: expected.types[0] }),
        documentType: content.type,
      },
      source: 'json-ld',
      at: context.now,
      why: 'Search engines connect a page to the thing it describes by this id, so a mismatch leaves the service, person or article unattached to its page.',
      fix: {
        summary:
          'The page’s feature builds this node from the document; find where it builds a node with another id or type.',
      },
    }),
  ]
}
