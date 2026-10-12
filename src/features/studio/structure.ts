import type { StructureResolver } from 'sanity/structure'

/** Desk structure. Add singletons (settings, navigation) here as `S.document()` items. */
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.documentTypeListItem('page').title('Pages'),
      S.divider(),
      // Everything else not explicitly listed above.
      ...S.documentTypeListItems().filter((item) => !['page'].includes(item.getId() ?? '')),
    ])
