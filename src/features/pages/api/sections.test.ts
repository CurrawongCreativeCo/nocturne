import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { panelRefsFragment } from './sections'

const source = readFileSync(new URL('./sections.ts', import.meta.url), 'utf8')

const fieldsUsing = (fragment: 'ctaFields' | 'portableTextFields') =>
  [...source.matchAll(new RegExp(`(\\w+)\\[\\] \\{ \\$\\{${fragment}\\} \\}`, 'g'))].map(
    (match) => match[1] ?? '',
  )

/**
 * PAGE_QUERY fetches the panels a page's buttons open by listing where such a link can sit
 * (panelRefsFragment). A section that gains links somewhere new must be added there, or its panel
 * button would silently fall back to its URL.
 */
describe('panelRefsFragment', () => {
  it('finds the panel in every place a section keeps buttons', () => {
    const fields = fieldsUsing('ctaFields')
    expect(fields.length).toBeGreaterThan(0)
    for (const field of fields) expect(panelRefsFragment).toContain(`.${field}[].link.panel._ref`)
  })

  it('finds the panel in every place a section keeps rich text', () => {
    const fields = fieldsUsing('portableTextFields')
    expect(fields.length).toBeGreaterThan(0)
    for (const field of fields)
      expect(panelRefsFragment).toContain(`${field}[].markDefs[].panel._ref`)
  })

  it('reads shared sections too, and leaves out members-only sections until the visitor is a member', () => {
    expect(panelRefsFragment).toContain('->section[access != "members" || $members]')
    expect(panelRefsFragment).toContain('^.pageBuilder[access != "members" || $members]')
  })
})
