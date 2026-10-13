import { ArrowRightIcon } from '@sanity/icons/ArrowRight'
import { CogIcon } from '@sanity/icons/Cog'
import { ComposeIcon } from '@sanity/icons/Compose'
import { EnvelopeIcon } from '@sanity/icons/Envelope'
import { FolderIcon } from '@sanity/icons/Folder'
import { TagIcon } from '@sanity/icons/Tag'
import { UserIcon } from '@sanity/icons/User'
import { map } from 'rxjs'
import type {
  StructureBuilder,
  StructureResolver,
  StructureResolverContext,
} from 'sanity/structure'

import { SINGLETON_TYPES } from './singletons'
import { groupPagePaths, type PageRef } from './utils/group-page-paths'

const PAGES_QUERY = `*[_type == "page"]{ _id, "slug": slug.current }`

/**
 * Pages as a tree: top-level pages, then one folder per first slug segment that has children
 * ("services/web-design" sits under "services"), then a flat "All pages" list. The page list is a
 * listener-backed query, so new pages and folders appear without reloading the Studio.
 */
const pagesTree = (S: StructureBuilder, { documentStore }: StructureResolverContext) =>
  S.listItem()
    .title('Pages')
    .id('pages')
    .child(
      documentStore.listenQuery(PAGES_QUERY, {}, {}).pipe(
        map((pages: PageRef[] | null) => {
          const { topLevelIds, folders } = groupPagePaths(pages ?? [])
          return S.list()
            .title('Pages')
            .items([
              ...topLevelIds.map((id) => S.documentListItem().id(id).schemaType('page')),
              ...(folders.length > 0 ? [S.divider()] : []),
              ...folders.map((segment) =>
                S.listItem()
                  .title(segment)
                  .id(`pages-folder-${segment}`)
                  .icon(FolderIcon)
                  .child(
                    S.documentList()
                      .title(segment)
                      .schemaType('page')
                      .filter('_type == "page" && slug.current match $prefix')
                      .params({ prefix: `${segment}/*` }),
                  ),
              ),
              S.divider(),
              S.documentTypeListItem('page').title('All pages'),
            ])
        }),
      ),
    )

/** Document types with their own place in the structure below; the catch-all list skips them. */
const LISTED_TYPES = new Set([
  'page',
  'sharedSection',
  'form',
  'redirect',
  'post',
  'author',
  'category',
])

/** Desk structure: singletons pinned at the top, then every other document type. */
export const structure: StructureResolver = (S, context) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Site settings')
        .id('settings')
        .icon(CogIcon)
        .child(S.document().schemaType('settings').documentId('settings').title('Site settings')),
      S.divider(),
      pagesTree(S, context),
      S.documentTypeListItem('sharedSection').title('Shared sections'),
      S.documentTypeListItem('form').title('Forms').icon(EnvelopeIcon),
      S.listItem()
        .title('Blog')
        .id('blog')
        .icon(ComposeIcon)
        .child(
          S.list()
            .title('Blog')
            .items([
              S.documentTypeListItem('post').title('Posts').icon(ComposeIcon),
              S.documentTypeListItem('author').title('Authors').icon(UserIcon),
              S.documentTypeListItem('category').title('Categories').icon(TagIcon),
            ]),
        ),
      S.documentTypeListItem('redirect').title('Redirects').icon(ArrowRightIcon),
      S.divider(),
      // Everything else not explicitly listed above.
      ...S.documentTypeListItems().filter((item) => {
        const id = item.getId() ?? ''
        return !LISTED_TYPES.has(id) && !SINGLETON_TYPES.has(id)
      }),
    ])
