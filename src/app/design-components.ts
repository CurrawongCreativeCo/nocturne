import { postCardCapabilities } from '@/features/blog/schemas/post-card-capabilities'
import { sectionTypes } from '@/features/pages/schemas/sections'
import { slotImage } from '@/features/pages/schemas/slot-image'
import { slotVideo } from '@/features/pages/schemas/slot-video'
import { SLOT_BLOCKS } from '@/features/pages/slots/registry'
import type { DesignCapabilityDeclaration } from '@/lib/design/capabilities'
import type { ContractComponent } from '@/lib/design/capability-policy'
import { schemaGate, type SchemaField } from '@/lib/design/schema-capabilities'
import * as badgeRow from '@/lib/sanity/schema/badge-row'
import * as blockContent from '@/lib/sanity/schema/block-content'
import * as cta from '@/lib/sanity/schema/cta'
import * as decorativeDivider from '@/lib/sanity/schema/decorative-divider'
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
  ...[
    badgeRow,
    blockContent,
    cta,
    decorativeDivider,
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
      declaration: declarationOf(type),
    }
  }),
  {
    id: 'blogPostCards',
    kind: 'listing',
    title: 'Blog post cards',
    layouts: [],
    declaration: postCardCapabilities,
  },
]

/** The schema each component is edited through (a listing has none). */
export const COMPONENT_SCHEMAS: ReadonlyMap<string, SchemaField> = new Map(
  DESIGN_COMPONENTS.flatMap((component) => {
    const type = SCHEMA_TYPES.get(component.id)
    return type ? [[component.id, type] as const] : []
  }),
)

export const gate = schemaGate(COMPONENT_SCHEMAS, lookupType)
