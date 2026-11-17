import type { SchemaTypeDefinition } from 'sanity'
import { describe, expect, it } from 'vitest'

import { isClientEditable } from '@/lib/sanity/client-editable'
import { headerDesignField } from '@/lib/sanity/schema/card-design-fields'

import { ctaBanner } from './cta-banner'
import { embed } from './embed'
import { events } from './events'
import { faq } from './faq'
import { featuresGrid } from './features-grid'
import { formSection } from './form-section'
import { gallery } from './gallery'
import { linkList } from './link-list'
import { location } from './location'
import { logoCloud } from './logo-cloud'
import { mediaText } from './media-text'
import { newsletterSignup } from './newsletter-signup'
import { pricingTable } from './pricing-table'
import { process } from './process'
import { stats } from './stats'
import { team } from './team'
import { testimonials } from './testimonials'
import { video } from './video'

interface Field {
  name: string
  type: string
  hidden?: (context: unknown) => boolean
  fields?: Field[]
}

/** The sections that offer the header divider (task 151): those `SectionHeader` draws, and Image + text, which draws its own. */
const WITH_DIVIDER = [
  'featuresGrid',
  'logoCloud',
  'testimonials',
  'faq',
  'ctaBanner',
  'formSection',
  'pricingTable',
  'newsletterSignup',
  'stats',
  'gallery',
  'location',
  'team',
  'video',
  'process',
  'embed',
  'events',
  'mediaText',
]
const headerOf = (type: SchemaTypeDefinition) =>
  (type as { fields?: Field[] }).fields?.find((field) => field.name === 'headerDesign')
const SECTIONS: SchemaTypeDefinition[] = [
  ctaBanner,
  embed,
  events,
  faq,
  featuresGrid,
  formSection,
  gallery,
  linkList,
  location,
  logoCloud,
  mediaText,
  newsletterSignup,
  pricingTable,
  process,
  stats,
  team,
  testimonials,
  video,
]
const section = (name: string) => {
  const found = SECTIONS.find((type) => type.name === name)
  if (!found) throw new Error(`No section ${name}`)
  return found
}

const client = { currentUser: { roles: [{ name: 'editor' }] } }
const agency = { currentUser: { roles: [{ name: 'administrator' }] } }

describe('the section header’s divider', () => {
  it.each(WITH_DIVIDER)('%s offers it, last, as the shared divider type', (name) => {
    const fields = headerOf(section(name))?.fields ?? []
    expect(fields.map((field) => field.name)).toEqual(['eyebrow', 'heading', 'intro', 'divider'])
    expect(fields.at(-1)?.type).toBe('decorativeDivider')
  })

  it.each(WITH_DIVIDER)('%s keeps it agency only: its box is hidden from clients', (name) => {
    const header = headerOf(section(name))
    expect(header?.hidden?.(client)).toBe(true)
    expect(header?.hidden?.(agency)).toBe(false)
    // A client may not change the box (the registry), so the divider inside it is never theirs.
    expect(isClientEditable(name, 'headerDesign')).toBe(false)
  })

  it('is not offered by the Link list, whose header is a wordmark or heading it lays out itself', () => {
    for (const name of ['linkList']) {
      expect((headerOf(section(name))?.fields ?? []).map((field) => field.name)).not.toContain(
        'divider',
      )
    }
  })

  it('is opt-in: the header box has only its three roles without it', () => {
    const box = headerDesignField() as unknown as Field
    expect((box.fields ?? []).map((field) => field.name)).toEqual(['eyebrow', 'heading', 'intro'])
  })
})
