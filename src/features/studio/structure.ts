import { ArrowRightIcon } from '@sanity/icons/ArrowRight'
import { BellIcon } from '@sanity/icons/Bell'
import { CalendarIcon } from '@sanity/icons/Calendar'
import { CaseIcon } from '@sanity/icons/Case'
import { CogIcon } from '@sanity/icons/Cog'
import { ColorWheelIcon } from '@sanity/icons/ColorWheel'
import { ComposeIcon } from '@sanity/icons/Compose'
import { DocumentsIcon } from '@sanity/icons/Documents'
import { DownloadIcon } from '@sanity/icons/Download'
import { EnvelopeIcon } from '@sanity/icons/Envelope'
import { ExpandIcon } from '@sanity/icons/Expand'
import { FolderIcon } from '@sanity/icons/Folder'
import { InboxIcon } from '@sanity/icons/Inbox'
import { LockIcon } from '@sanity/icons/Lock'
import { MenuIcon } from '@sanity/icons/Menu'
import { SearchIcon } from '@sanity/icons/Search'
import { SplitHorizontalIcon } from '@sanity/icons/SplitHorizontal'
import { StackIcon } from '@sanity/icons/Stack'
import { TagIcon } from '@sanity/icons/Tag'
import { UserIcon } from '@sanity/icons/User'
import { UsersIcon } from '@sanity/icons/Users'
import { WrenchIcon } from '@sanity/icons/Wrench'
import type { ComponentType } from 'react'
import { map } from 'rxjs'
import type {
  ListItemBuilder,
  StructureBuilder,
  StructureResolver,
  StructureResolverContext,
} from 'sanity/structure'

import { apiVersion } from '@/config/env'

import { downloadEnquiriesCsv } from './enquiries/download-csv'
import { enquiriesTitle } from './enquiries/wording'
import { currentAudience } from './roles'
import { SINGLETON_TYPES } from './singletons'
import { TeamOrderPane } from './team-order/team-order-pane'
import {
  PAST_EVENTS_FILTER,
  PAST_EVENTS_ORDER,
  UPCOMING_EVENTS_FILTER,
  UPCOMING_EVENTS_ORDER,
} from './utils/event-lists'
import { isTypeVisible } from './utils/feature-visibility'
import { groupPagePaths, type PageRef } from './utils/group-page-paths'
import {
  CLIENT_REUSABLE_IDS,
  CLIENT_WEBSITE_SETTINGS_IDS,
  filterStructureItems,
} from './utils/structure-access'
// new-singleton:import

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
    .icon(DocumentsIcon)
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

const NEW_ENQUIRIES_QUERY = `count(*[_type == "enquiry" && status == "new"])`

/**
 * Enquiries, newest first. The count of new ones is a listener-backed query, so the pane title
 * ("Enquiries (3 new)") follows it as enquiries arrive or are marked read. "Download CSV" builds
 * the file in the browser (enquiries/download-csv.ts). Nobody creates an enquiry by hand, so the
 * list has no "create" button.
 */
const enquiriesList = (
  S: StructureBuilder,
  { documentStore, getClient }: StructureResolverContext,
) =>
  S.listItem()
    .title('Enquiries')
    .id('enquiries')
    .icon(InboxIcon)
    .child(
      documentStore.listenQuery(NEW_ENQUIRIES_QUERY, {}, {}).pipe(
        map((count: number | null) =>
          S.documentList()
            .id('enquiries')
            .title(enquiriesTitle(count ?? 0))
            .schemaType('enquiry')
            .filter('_type == "enquiry"')
            .defaultOrdering([{ field: 'createdAt', direction: 'desc' }])
            .initialValueTemplates([])
            .menuItems([
              S.menuItem()
                .title('Download CSV')
                .icon(DownloadIcon)
                .showAsAction(true)
                .action(() => {
                  void downloadEnquiriesCsv(getClient({ apiVersion }))
                }),
            ]),
        ),
      ),
    )

/** Document types with their own place in the structure below; the catch-all list skips them. */
const LISTED_TYPES = new Set([
  'page',
  'sharedSection',
  'form',
  'redirect',
  'experiment',
  'post',
  'author',
  'category',
  'stripePrice',
  'teamMember',
  'event',
  'eventCategory',
  'frame',
  'enquiry',
  'panel',
  // new-document:listed
])

/**
 * Design screens (brand colours now; motion presets arrive in a later task). Each shows under
 * "Design" only once its singleton type is in the schema, so the group never appears empty.
 */
const DESIGN_SINGLETONS = [
  { type: 'designSettings', title: 'Brand colours' },
  { type: 'motionPresets', title: 'Motion presets' },
] as const

type Item = ListItemBuilder | ReturnType<StructureBuilder['divider']>

/** An item's id, or null for a divider (see filterStructureItems). */
const idOf = (item: Item) => ('getId' in item ? item.getId() : null)

const singletonItem = (S: StructureBuilder, type: string, title: string, icon: ComponentType) =>
  S.listItem()
    .title(title)
    .id(type)
    .icon(icon)
    .child(S.document().schemaType(type).documentId(type).title(title))

/** A sidebar group: one item that opens a list of its own. */
const group = (
  S: StructureBuilder,
  id: string,
  title: string,
  icon: ComponentType,
  items: Item[],
) => S.listItem().title(title).id(id).icon(icon).child(S.list().id(id).title(title).items(items))

/**
 * Desk structure, grouped by what people do rather than by schema type: Pages, Blog, Reusable
 * content, Website settings, Design and Advanced. Clients see only the items listed in
 * CLIENT_STRUCTURE_IDS (utils/structure-access.ts), and inside Website settings only
 * CLIENT_WEBSITE_SETTINGS_IDS.
 */
export const structure: StructureResolver = (S, context) => {
  const audience = currentAudience(context.currentUser)
  const hasType = (name: string) => Boolean(context.schema.get(name))

  const websiteSettings = filterStructureItems(
    [
      singletonItem(S, 'siteIdentity', 'Identity & search', SearchIcon),
      singletonItem(S, 'siteNavigation', 'Navigation', MenuIcon),
      singletonItem(S, 'announcement', 'Announcement bar', BellIcon),
      singletonItem(S, 'cookieBanner', 'Cookie banner', LockIcon),
    ],
    audience,
    idOf,
    CLIENT_WEBSITE_SETTINGS_IDS,
  )
  const design = [
    ...DESIGN_SINGLETONS.filter(({ type }) => hasType(type)).map(({ type, title }) =>
      singletonItem(S, type, title, ColorWheelIcon),
    ),
    // The approved SVG frames a picture can use (agency only, like the rest of Design).
    ...(hasType('frame') ? [S.documentTypeListItem('frame').title('Image frames')] : []),
  ]

  const items: Item[] = [
    // new-singleton:list
    pagesTree(S, context),
    ...(isTypeVisible('post')
      ? [
          group(S, 'blog', 'Blog', ComposeIcon, [
            S.documentTypeListItem('post').title('Posts').icon(ComposeIcon),
            S.documentTypeListItem('author').title('Authors').icon(UserIcon),
            S.documentTypeListItem('category').title('Categories').icon(TagIcon),
          ]),
        ]
      : []),
    singletonItem(S, 'businessInfo', 'Business info', CaseIcon),
    ...(hasType('teamMember') && isTypeVisible('teamMember')
      ? [
          S.listItem()
            .title('Team')
            .id('team')
            .icon(UsersIcon)
            .child(S.component(TeamOrderPane).id('team').title('Team')),
        ]
      : []),
    ...(hasType('event') && isTypeVisible('event')
      ? [
          group(S, 'events', 'Events', CalendarIcon, [
            S.listItem()
              .title('Upcoming')
              .id('events-upcoming')
              .icon(CalendarIcon)
              .child(
                S.documentList()
                  .id('events-upcoming')
                  .title('Upcoming events')
                  .schemaType('event')
                  .filter(UPCOMING_EVENTS_FILTER)
                  .defaultOrdering([...UPCOMING_EVENTS_ORDER]),
              ),
            S.listItem()
              .title('Past')
              .id('events-past')
              .icon(CalendarIcon)
              .child(
                S.documentList()
                  .id('events-past')
                  .title('Past events')
                  .schemaType('event')
                  .filter(PAST_EVENTS_FILTER)
                  .defaultOrdering([...PAST_EVENTS_ORDER]),
              ),
            S.documentTypeListItem('event').title('All events').icon(CalendarIcon),
            S.documentTypeListItem('eventCategory').title('Categories').icon(TagIcon),
          ]),
        ]
      : []),
    ...(hasType('enquiry') && isTypeVisible('enquiry') ? [enquiriesList(S, context)] : []),
    // new-document:list
    S.divider(),
    group(
      S,
      'reusable',
      'Reusable content',
      StackIcon,
      // Clients edit panels' content; the rest stays with the agency (CLIENT_REUSABLE_IDS).
      filterStructureItems(
        [
          S.documentTypeListItem('sharedSection').title('Shared sections'),
          ...(isTypeVisible('form')
            ? [S.documentTypeListItem('form').title('Forms').icon(EnvelopeIcon)]
            : []),
          ...(hasType('panel')
            ? [S.documentTypeListItem('panel').title('Panels').icon(ExpandIcon)]
            : []),
        ],
        audience,
        idOf,
        CLIENT_REUSABLE_IDS,
      ),
    ),
    group(S, 'websiteSettings', 'Website settings', CogIcon, websiteSettings),
    ...(design.length > 0 ? [group(S, 'design', 'Design', ColorWheelIcon, design)] : []),
    S.divider(),
    group(S, 'advanced', 'Advanced', WrenchIcon, [
      S.documentTypeListItem('redirect').title('Redirects').icon(ArrowRightIcon),
      ...(isTypeVisible('experiment')
        ? [S.documentTypeListItem('experiment').title('A/B tests').icon(SplitHorizontalIcon)]
        : []),
      ...(hasType('stripePrice') && isTypeVisible('stripePrice')
        ? [S.documentTypeListItem('stripePrice').title('Stripe prices')]
        : []),
      S.divider(),
      // Everything else not explicitly listed above.
      ...S.documentTypeListItems().filter((item) => {
        const id = item.getId() ?? ''
        return !LISTED_TYPES.has(id) && !SINGLETON_TYPES.has(id) && isTypeVisible(id)
      }),
    ]),
  ]
  return S.list()
    .title('Content')
    .items(filterStructureItems(items, audience, idOf))
}
