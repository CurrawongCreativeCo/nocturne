import { describe, expect, it } from 'vitest'

import { parseSectionArgs, toSectionNames } from './section-names.mjs'
import {
  componentTemplate,
  dispatcherTemplate,
  fragmentTemplate,
  galleryTemplate,
  schemaTemplate,
  variantComponentTemplate,
} from './section-templates.mjs'

const names = toSectionNames('pricing-table')

describe('new section templates', () => {
  it('give the schema a Design group and the shared style field', () => {
    const schema = schemaTemplate(names)
    expect(schema).toContain('groups: sectionGroups')
    expect(schema).toContain('fields: sectionFields(')
    expect(schema).toContain("name: 'pricingTable'")
    expect(schema).toContain("subtitle: 'Pricing table'")
  })

  it('project the shared style in the GROQ fragment, keeping the members-only condition', () => {
    const fragment = fragmentTemplate(names)
    expect(fragment).toContain('export const pricingTableFragment')
    expect(fragment).toContain('(access != "members" || $members)')
    expect(fragment).toContain('style { ${sectionStyleFields} }')
  })

  it('render the component inside a SectionFrame instead of its own <section>', () => {
    const component = componentTemplate(names)
    expect(component).toContain('export function PricingTable(')
    expect(component).toContain('<SectionFrame')
    expect(component).toContain('style={data.style}')
    expect(component).not.toContain('<section')
  })

  it('escape the title in the gallery fixture', () => {
    expect(galleryTemplate({ ...names, title: "Tom's" })).toContain("title: 'Tom\\'s'")
  })

  it('add no variant field to a plain section', () => {
    expect(schemaTemplate(names)).not.toContain('variant')
    expect(fragmentTemplate(names)).not.toContain('variant')
    expect(galleryTemplate(names)).toContain("_key: 'pricing-table'")
  })
})

describe('new section templates with variants', () => {
  const { variants } = parseSectionArgs(['pricing-table', '--variants', 'cards,full-bleed'])

  it('add the variant field, its list and the subtitle to the schema', () => {
    const schema = schemaTemplate(names, variants)
    expect(schema).toContain('export const PRICING_TABLE_VARIANTS = [')
    expect(schema).toContain("{ value: 'cards', title: 'Cards' },")
    expect(schema).toContain("{ value: 'full-bleed', title: 'Full bleed' },")
    expect(schema).toContain('variantField(PRICING_TABLE_VARIANTS)')
    expect(schema).toContain("variantSubtitle('Pricing table', PRICING_TABLE_VARIANTS, variant)")
  })

  it('project the variant in the fragment', () => {
    expect(fragmentTemplate(names, variants)).toContain('variant,')
  })

  it('write one gallery entry per variant', () => {
    const gallery = galleryTemplate(names, variants)
    expect(gallery).toContain("_key: 'pricing-table-cards'")
    expect(gallery).toContain("variant: 'full-bleed'")
  })

  it('write a dispatcher that falls back to the first variant', () => {
    const dispatcher = dispatcherTemplate(names, variants)
    expect(dispatcher).toContain('export function PricingTable(')
    expect(dispatcher).toContain('stegaClean(props.data.variant)')
    expect(dispatcher).toContain("case 'full-bleed':")
    expect(dispatcher).toContain('return <PricingTableFullBleed {...props} />')
    expect(dispatcher).toContain('default:\n      return <PricingTableCards {...props} />')
    expect(dispatcher).toContain("from './full-bleed'")
  })

  it('name each variant component after its section and put it a folder deeper', () => {
    const component = variantComponentTemplate(names, variants[1])
    expect(component).toContain('export function PricingTableFullBleed(')
    expect(component).toContain("from '../../../types'")
    expect(component).toContain('<SectionFrame')
  })
})
