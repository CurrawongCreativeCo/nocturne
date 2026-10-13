import { ArrowRightIcon } from '@sanity/icons/ArrowRight'
import { CogIcon } from '@sanity/icons/Cog'
import { FolderIcon } from '@sanity/icons/Folder'
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
      S.documentTypeListItem('redirect').title('Redirects').icon(ArrowRightIcon),
      S.divider(),
      // Everything else not explicitly listed above.
      ...S.documentTypeListItems().filter((item) => {
        const id = item.getId() ?? ''
        return (
          id !== 'page' && id !== 'sharedSection' && id !== 'redirect' && !SINGLETON_TYPES.has(id)
        )
      }),
    ])
