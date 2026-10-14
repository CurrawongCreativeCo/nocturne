import { describe, expect, it } from 'vitest'

import { toSectionNames } from './section-names.mjs'
import {
  componentTemplate,
  fragmentTemplate,
  galleryTemplate,
  schemaTemplate,
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
})
