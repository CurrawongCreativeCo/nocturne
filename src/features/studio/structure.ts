import { CogIcon } from '@sanity/icons/Cog'
import type { StructureResolver } from 'sanity/structure'

import { SINGLETON_TYPES } from './singletons'

/** Desk structure: singletons pinned at the top, then every other document type. */
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Site settings')
        .id('settings')
        .icon(CogIcon)
        .child(S.document().schemaType('settings').documentId('settings').title('Site settings')),
      S.divider(),
      S.documentTypeListItem('page').title('Pages'),
      S.divider(),
      // Everything else not explicitly listed above.
      ...S.documentTypeListItems().filter((item) => {
        const id = item.getId() ?? ''
        return id !== 'page' && !SINGLETON_TYPES.has(id)
      }),
    ])
