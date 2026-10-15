import { slugToPath } from '@/config/paths'
import type { CONTENT_HEALTH_QUERY_RESULT } from '@/types/sanity.types'

import {
  collectLinkTargets,
  collectSharedSectionIds,
  findBrokenLinkTargets,
  findImagesWithoutAlt,
  findOrphanPages,
  findRedirectProblems,
  resolveVersions,
  type PageLink,
} from './detect'

export interface HealthItem {
  /** Published document id and type, as the "edit" intent expects them. */
  id: string
  type: 'page' | 'sharedSection' | 'siteNavigation' | 'redirect'
  title: string
  detail?: string
}

export interface HealthGroup {
  id: string
  title: string
  description: string
  items: HealthItem[]
}

const NAVIGATION_ID = 'siteNavigation'
const DELETED_PAGE = 'a deleted page'

/** Runs every check over the query result. Drafts count, so fixing a problem in a draft clears it. */
export function buildReport(data: CONTENT_HEALTH_QUERY_RESULT): HealthGroup[] {
  const pages = resolveVersions(data.pages)
  const navigation = resolveVersions(data.navigation)[0]
  const titles = new Map(pages.map(({ id, doc }) => [id, doc.title]))
  const publishedIds = new Set(pages.filter(({ published }) => published).map(({ id }) => id))

  const sharedSections = resolveVersions(data.sharedSections)
  const publishedPages = pages.filter(({ published }) => published)
  // Shared sections only reach visitors through a published page that references them.
  const usedSharedIds = new Set(
    publishedPages.flatMap(({ doc }) => collectSharedSectionIds(doc.pageBuilder)),
  )

  // Only content the live site shows can link to, or fail to link to, a page.
  const linkSources = [
    ...publishedPages.map(({ id, doc }) => ({
      id,
      type: 'page' as const,
      title: doc.title,
      content: doc.pageBuilder,
    })),
    ...sharedSections
      .filter(({ id, published }) => published && usedSharedIds.has(id))
      .map(({ id, doc }) => ({
        id,
        type: 'sharedSection' as const,
        title: doc.title,
        content: doc.section,
      })),
    ...(navigation
      ? [
          {
            id: NAVIGATION_ID,
            type: 'siteNavigation' as const,
            title: 'Navigation',
            content: [navigation.doc.headerNav, navigation.doc.headerCta, navigation.doc.footerNav],
          },
        ]
      : []),
  ]

  const noDescription: HealthItem[] = pages
    .filter(({ doc }) => !doc.metaDescription?.trim())
    .map(({ id, doc }) => ({ id, type: 'page', title: doc.title, detail: slugToPath(doc.slug) }))

  const imageSources = [
    ...pages.map(({ id, doc }) => ({
      id,
      type: 'page' as const,
      title: doc.title,
      sections: doc.pageBuilder,
    })),
    ...sharedSections.map(({ id, doc }) => ({
      id,
      type: 'sharedSection' as const,
      title: doc.title,
      sections: doc.section,
    })),
  ]
  const noAlt = imageSources.flatMap(({ id, type, title, sections }): HealthItem[] => {
    const labels = findImagesWithoutAlt(sections)
    return labels.length
      ? [
          {
            id,
            type,
            title,
            detail: `${labels.length} ${labels.length === 1 ? 'image' : 'images'}: ${[...new Set(labels)].join(', ')}`,
          },
        ]
      : []
  })

  const brokenLinks = linkSources.flatMap(({ id, type, title, content }): HealthItem[] => {
    const broken = findBrokenLinkTargets(content, publishedIds)
    return broken.length
      ? [
          {
            id,
            type,
            title,
            detail: `Links to ${broken.map((target) => titles.get(target) ?? DELETED_PAGE).join(', ')}, which ${broken.length === 1 ? 'has' : 'have'} no published version`,
          },
        ]
      : []
  })

  const redirectTitles = new Map(data.redirects.map((rule) => [rule._id, rule.source]))
  const redirects = findRedirectProblems(
    data.redirects.flatMap((rule) =>
      rule.source && rule.destination
        ? [{ id: rule._id, source: rule.source, destination: rule.destination }]
        : [],
    ),
  ).map(({ id, kind, path }): HealthItem => ({
    id,
    type: 'redirect',
    title: redirectTitles.get(id) ?? id,
    detail: `${kind === 'loop' ? 'Loop' : 'Chain'}: ${path.join(' → ')}`,
  }))

  const links: PageLink[] = linkSources.flatMap(({ id, content }) =>
    collectLinkTargets(content).map((to) => ({ from: id, to })),
  )
  const orphans = findOrphanPages(
    publishedPages.map(({ id, doc }) => ({ id, slug: doc.slug, title: doc.title })),
    links,
  ).map(({ id, slug, title }): HealthItem => ({
    id,
    type: 'page',
    title,
    detail: slugToPath(slug),
  }))

  return [
    {
      id: 'meta-description',
      title: 'Pages without a meta description',
      description:
        'Search results show the default description instead of one written for the page.',
      items: noDescription,
    },
    {
      id: 'alt-text',
      title: 'Images without alt text',
      description: 'Screen reader users get no description of these images.',
      items: noAlt,
    },
    {
      id: 'broken-links',
      title: 'Links to unpublished pages',
      description: 'Visitors following these links reach a page that does not exist.',
      items: brokenLinks,
    },
    {
      id: 'redirects',
      title: 'Redirect chains and loops',
      description: 'Point each redirect straight at its final destination; loops never resolve.',
      items: redirects,
    },
    {
      id: 'orphans',
      title: 'Orphan pages',
      description: 'Published pages that no menu or other page links to.',
      items: orphans,
    },
  ]
}
