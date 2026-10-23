import type { START_HERE_QUERY_RESULT } from '@/types/sanity.types'

import type { ChangedDocument } from './recent'
import { daysBetween, isStaleDraft } from './relative-time'
import { displayTitle, plural } from './wording'
import {
  collectSharedSectionIds,
  findBrokenLinkTargets,
  findImagesWithoutAlt,
  resolveVersions,
} from '../../content-health/utils/detect'

export const MAX_CHECKS = 5

export interface CheckItem {
  key: string
  kind: 'link' | 'alt' | 'draft'
  /** Published id and type, as the edit intent expects them. */
  id: string
  type: string
  message: string
}

export interface ThingsToCheck {
  /** At most `MAX_CHECKS`, most important first. */
  items: CheckItem[]
  /** How many more there were beyond the ones shown. */
  more: number
}

interface Options {
  now: number
  /** Whether the viewer may use shared sections, which only agency staff see. */
  includeSharedSections: boolean
  /** Whether Start here should mention this document type. */
  shown: (type: string) => boolean
  /** A document type's title for wording ("Page"), falling back to the name. */
  typeTitle: (type: string) => string
}

const quote = (title: string) => `“${title}”`

/**
 * Plain-wording problems for the client to fix: links to pages that are not published, images
 * with no description, and drafts left unpublished for over a week. Reuses the content-health
 * detectors; drafts count, so fixing a problem in a draft clears it.
 */
export function buildThingsToCheck(
  data: Pick<START_HERE_QUERY_RESULT, 'pages' | 'sharedSections' | 'navigation' | 'drafts'>,
  { now, includeSharedSections, shown, typeTitle }: Options,
): ThingsToCheck {
  const pages = resolveVersions(data.pages)
  const publishedPages = pages.filter(({ published }) => published)
  const publishedIds = new Set(publishedPages.map(({ id }) => id))
  const sharedSections = includeSharedSections ? resolveVersions(data.sharedSections) : []
  const usedSharedIds = new Set(
    publishedPages.flatMap(({ doc }) => collectSharedSectionIds(doc.pageBuilder)),
  )
  const navigation = resolveVersions(data.navigation)[0]

  const linkSources = [
    ...publishedPages.map(({ id, doc }) => ({
      id,
      type: 'page',
      title: doc.title,
      content: doc.pageBuilder,
    })),
    ...sharedSections
      .filter(({ id, published }) => published && usedSharedIds.has(id))
      .map(({ id, doc }) => ({
        id,
        type: 'sharedSection',
        title: doc.title,
        content: doc.section,
      })),
    ...(navigation
      ? [
          {
            id: 'siteNavigation',
            type: 'siteNavigation',
            title: 'Navigation',
            content: [
              navigation.doc.headerNav,
              navigation.doc.headerCta,
              navigation.doc.footerNav,
            ] as unknown,
          },
        ]
      : []),
  ]
  const links = linkSources.flatMap(({ id, type, title, content }): CheckItem[] => {
    const broken = findBrokenLinkTargets(content, publishedIds).length
    return broken
      ? [
          {
            key: `link-${id}`,
            kind: 'link',
            id,
            type,
            message: `${quote(displayTitle(title, typeTitle(type), type))} links to ${
              broken === 1 ? 'a page that is' : `${broken} pages that are`
            } not published yet`,
          },
        ]
      : []
  })

  const imageSources = [
    ...pages.map(({ id, doc }) => ({
      id,
      type: 'page',
      title: doc.title,
      sections: doc.pageBuilder,
    })),
    ...sharedSections.map(({ id, doc }) => ({
      id,
      type: 'sharedSection',
      title: doc.title,
      sections: doc.section,
    })),
  ]
  const images = imageSources.flatMap(({ id, type, title, sections }): CheckItem[] => {
    const count = findImagesWithoutAlt(sections).length
    return count
      ? [
          {
            key: `alt-${id}`,
            kind: 'alt',
            id,
            type,
            message: `${quote(displayTitle(title, typeTitle(type), type))} has ${plural(count, 'image', 'images')} without a description`,
          },
        ]
      : []
  })

  const drafts = (data.drafts as ChangedDocument[])
    .filter((draft) => shown(draft._type) && isStaleDraft(draft._updatedAt, now))
    .map((draft): CheckItem => ({
      key: `draft-${draft._id}`,
      kind: 'draft',
      id: draft._id.replace(/^drafts\./, ''),
      type: draft._type,
      message: `${quote(displayTitle(draft.title, typeTitle(draft._type), draft._type))} has had changes waiting to be published for ${plural(daysBetween(draft._updatedAt, now), 'day', 'days')}`,
    }))

  const all = [...links, ...images, ...drafts]
  return { items: all.slice(0, MAX_CHECKS), more: Math.max(0, all.length - MAX_CHECKS) }
}
