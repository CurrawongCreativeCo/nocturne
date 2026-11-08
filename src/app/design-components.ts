import { blogSettings } from '@/features/blog/schemas/blog-settings'
import { post } from '@/features/blog/schemas/post'
import { postCardCapabilities } from '@/features/blog/schemas/post-card-capabilities'
import { eventDetailsCardCapabilities } from '@/features/events/schemas/event-details-card-capabilities'
import { sectionTypes } from '@/features/pages/schemas/sections'
import { slotImage } from '@/features/pages/schemas/slot-image'
import { slotVideo } from '@/features/pages/schemas/slot-video'
import { SLOT_BLOCKS, SLOT_FAMILIES } from '@/features/pages/slots/registry'
import { searchResultsCapabilities } from '@/features/search/schemas/search-results-capabilities'
import { servicePageCapabilities } from '@/features/services/schemas/service-page-capabilities'
import { siteFooterCapabilities } from '@/features/site/schemas/site-footer-capabilities'
import { siteNavigation } from '@/features/site/schemas/site-navigation'
import { teamMember } from '@/features/team/schemas/team-member'
import { teamMemberPageCapabilities } from '@/features/team/schemas/team-member-page-capabilities'
import { teamPageSettings } from '@/features/team/schemas/team-page-settings'
import type { DesignCapabilityDeclaration } from '@/lib/design/capabilities'
import type { ContractComponent, SlotHost } from '@/lib/design/capability-policy'
import { schemaGate, type SchemaField } from '@/lib/design/schema-capabilities'
import * as badgeRow from '@/lib/sanity/schema/badge-row'
import * as blockContent from '@/lib/sanity/schema/block-content'
import * as cta from '@/lib/sanity/schema/cta'
import * as decorativeDivider from '@/lib/sanity/schema/decorative-divider'
import * as decorativeMark from '@/lib/sanity/schema/decorative-mark'
import * as headingText from '@/lib/sanity/schema/heading-text'
import * as imageDesign from '@/lib/sanity/schema/image-design'
import * as launchDate from '@/lib/sanity/schema/launch-date'
import * as link from '@/lib/sanity/schema/link'
import * as logoRow from '@/lib/sanity/schema/logo-row'
import { sectionStyle } from '@/lib/sanity/schema/section-style'
import * as stats from '@/lib/sanity/schema/stats'

/**
 * Every component the design capability contract covers (task 275; README, "Design capability
 * contract"): the page builder's sections, the slot blocks and the listings that aren't sections.
 * Composed here because only app code may bring features together. Read by the capability checks and
 * the design manifest; nothing on a page imports it.
 */

/** The named types fields refer to (section style, dividers, slot blocks, links), by name. */
const named = [
  sectionStyle,
  slotImage,
  slotVideo,
  // The document a listing's cards show: the blog's cards are drawn from a post.
  post,
  blogSettings,
  // The documents the footer and a team member's page are drawn from.
  siteNavigation,
  teamMember,
  teamPageSettings,
  ...[
    badgeRow,
    blockContent,
    cta,
    decorativeDivider,
    decorativeMark,
    headingText,
    imageDesign,
    launchDate,
    link,
    logoRow,
    stats,
  ].flatMap((module) =>
    Object.values(module).filter(
      (value): value is SchemaField =>
        typeof value === 'object' && value !== null && 'name' in value && 'type' in value,
    ),
  ),
] as SchemaField[]

const sections = sectionTypes as unknown as SchemaField[]

/** Schema types by name: every section and every named type a field may use. */
export const SCHEMA_TYPES: ReadonlyMap<string, SchemaField> = new Map(
  [...sections, ...named].map((type) => [type.name, type]),
)

export const lookupType = (name: string) => SCHEMA_TYPES.get(name)

const layoutsOf = (type: SchemaField): string[] => {
  const list = type.fields?.find((field) => field.name === 'variant')?.options?.list as
    ({ value?: string } | string)[] | undefined
  return (list ?? []).map((entry) => (typeof entry === 'string' ? entry : (entry.value ?? '')))
}

/**
 * Every host a slot block is allowed in, from the registry: each slot (`<family>.<field>`) that lists the
 * block, on the section the family maps to, in all of that section's layouts. The block's evidence
 * must hold in every one of them.
 */
function hostsOf(allowedIn: readonly string[]): SlotHost[] {
  return allowedIn.flatMap((slot) => {
    const [family = '', field = ''] = slot.split('.')
    const section = sections.find(
      (type) =>
        type.name === ((SLOT_FAMILIES as Record<string, string>)[family] ?? family) &&
        type.fields?.some((candidate) => candidate.name === field),
    )
    return section ? [{ section: section.name, slot: field, layouts: layoutsOf(section) }] : []
  })
}

const declarationOf = (type: SchemaField) =>
  type.options?.designCapabilities as DesignCapabilityDeclaration | undefined

/** The components, in the Studio's order: sections, then slot blocks, then listings. */
export const DESIGN_COMPONENTS: readonly ContractComponent[] = [
  ...sections.map((type): ContractComponent => ({
    id: type.name,
    kind: 'section',
    title: type.title ?? type.name,
    layouts: layoutsOf(type),
    declaration: declarationOf(type),
  })),
  ...Object.values(SLOT_BLOCKS).map((block): ContractComponent => {
    const type = SCHEMA_TYPES.get(block.schemaType)
    if (!type)
      throw new Error(
        `The slot registry lists ${block.schemaType}, but no schema type has that name.`,
      )
    return {
      id: type.name,
      kind: 'slotBlock',
      title: type.title ?? type.name,
      layouts: [],
      hosts: hostsOf(block.allowedIn),
      declaration: declarationOf(type),
    }
  }),
  {
    id: 'eventDetailsCard',
    kind: 'view',
    title: 'Event details card',
    layouts: [],
    declaration: eventDetailsCardCapabilities,
  },
  {
    id: 'servicePage',
    kind: 'view',
    title: 'Service page',
    layouts: [],
    declaration: servicePageCapabilities,
  },
  {
    id: 'searchResults',
    kind: 'view',
    title: 'Search results',
    layouts: [],
    declaration: searchResultsCapabilities,
  },
  {
    id: 'siteFooter',
    kind: 'view',
    title: 'Site footer',
    layouts: [],
    declaration: siteFooterCapabilities,
  },
  {
    id: 'teamMemberPage',
    kind: 'view',
    title: 'Team member page',
    layouts: [],
    declaration: teamMemberPageCapabilities,
  },
  {
    id: 'blogPostCards',
    kind: 'listing',
    title: 'Blog post cards',
    layouts: [],
    declaration: postCardCapabilities,
  },
]

/**
 * The schema of a listing or a view: made from the real document types it draws, so evidence reads the
 * same fields the Studio shows. Blog post cards draw a post, in the design Blog settings holds.
 */
const VIEW_SCHEMAS: readonly SchemaField[] = [
  {
    name: 'blogPostCards',
    type: 'object',
    fields: [
      { name: 'post', type: 'post', group: 'content' },
      { name: 'settings', type: 'blogSettings', group: 'design' },
    ],
  },
  {
    // The footer's social icons are controlled from Navigation (footerIconDesign).
    name: 'siteFooter',
    type: 'object',
    fields: [{ name: 'navigation', type: 'siteNavigation' }],
  },
  {
    // A member's page: the member, in the design Team page settings holds for every member.
    name: 'teamMemberPage',
    type: 'object',
    fields: [
      { name: 'member', type: 'teamMember', group: 'content' },
      { name: 'settings', type: 'teamPageSettings' },
    ],
  },
]

/** The schema each component is edited through: a section's or block's own type, or a view's. */
export const COMPONENT_SCHEMAS: ReadonlyMap<string, SchemaField> = new Map([
  ...DESIGN_COMPONENTS.flatMap((component) => {
    const type = SCHEMA_TYPES.get(component.id)
    return type ? [[component.id, type] as const] : []
  }),
  ...VIEW_SCHEMAS.map((type) => [type.name, type] as const),
])

export const gate = schemaGate(COMPONENT_SCHEMAS, lookupType)
