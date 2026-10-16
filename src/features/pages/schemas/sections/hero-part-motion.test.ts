import { describe, expect, it } from 'vitest'

import { HERO_PARTS } from '@/features/pages/utils/hero-parts'
import { PART_DELAYS } from '@/lib/sanity/section-style-options'

import { hero } from './hero'
import { heroPartMotionField } from './hero-part-motion'

type Callback = (context: Record<string, unknown>) => boolean
interface Field {
  name: string
  fieldset?: string
  group?: string
  hidden?: Callback
  initialValue?: unknown
  options?: { list?: { value: string }[] }
}

const fields = (heroPartMotionField as unknown as { fields: Field[] }).fields
function find<T extends Field>(list: readonly T[], name: string): T {
  const found = list.find((candidate) => candidate.name === name)
  if (!found) throw new Error(`No field ${name}`)
  return found
}
const field = (name: string) => find(fields, name)
const isHidden = (name: string, context: Record<string, unknown>) =>
  field(name).hidden?.(context) ?? false
const valuesOf = (name: string) => (field(name).options?.list ?? []).map((option) => option.value)

/** The context Studio gives a row of the first hero on a page: its section is two path segments up. */
const row = (hero: Record<string, unknown>, enabled: boolean, name: string) => ({
  document: { _type: 'page', pageBuilder: [{ _key: 'h', _type: 'hero', ...hero }] },
  path: ['pageBuilder', { _key: 'h' }, 'partMotion', name],
  parent: { enabled },
})

const picture = { asset: { _ref: 'image-abc' } }
const shown = (hero: Record<string, unknown>, part: string, enabled = true) =>
  !isHidden(`${part}Preset`, row(hero, enabled, `${part}Preset`)) &&
  !isHidden(`${part}Delay`, row(hero, enabled, `${part}Delay`))

describe('the hero’s Animate individual parts', () => {
  it('is an agency-only Advanced field, off by default', () => {
    const advanced = find((hero as unknown as { fields: Field[] }).fields, 'partMotion')
    expect(advanced).toMatchObject({ group: 'design', fieldset: 'advanced' })
    // Clients never see it; agency staff do.
    expect(advanced.hidden?.({ currentUser: { roles: [{ name: 'editor' }] } })).toBe(true)
    expect(advanced.hidden?.({ currentUser: { roles: [{ name: 'administrator' }] } })).toBe(false)
    expect(field('enabled').initialValue).toBe(false)
  })

  it('has one row, an animation and a delay side by side, per part', () => {
    for (const part of HERO_PARTS) {
      expect(field(`${part}Preset`).fieldset).toBe(part)
      expect(field(`${part}Delay`).fieldset).toBe(part)
      expect(field(`${part}Preset`).initialValue).toBe('inherit')
      expect(field(`${part}Delay`).initialValue).toBe('auto')
    }
    const fieldsets = (
      heroPartMotionField as unknown as { fieldsets: { name: string; options: object }[] }
    ).fieldsets
    expect(fieldsets.map((set) => set.name)).toEqual([...HERO_PARTS])
    for (const set of fieldsets) expect(set.options).toMatchObject({ columns: 2 })
  })

  it('offers the same delays for every part and Parallax only for the pictures', () => {
    for (const part of HERO_PARTS) {
      const values = valuesOf(`${part}Preset`)
      expect(values.slice(0, 2)).toEqual(['inherit', 'none'])
      expect(values.includes('parallax')).toBe(part === 'image' || part === 'background')
      expect(valuesOf(`${part}Delay`)).toEqual([...PART_DELAYS])
    }
  })

  it('shows no rows until the switch is on', () => {
    expect(shown({}, 'heading', false)).toBe(false)
    expect(shown({}, 'heading')).toBe(true)
  })

  it('shows rows only for the parts the layout and content have', () => {
    const content = {
      eyebrow: 'Eyebrow',
      description: 'Text',
      ctas: [{ _key: 'c' }],
      supporting: [{ _key: 's' }],
      backgroundImage: picture,
    }
    const visible = (layout: Record<string, unknown>) =>
      HERO_PARTS.filter((part) => shown({ ...content, ...layout }, part))

    expect(visible({ variant: 'overlay' })).toEqual([
      'eyebrow',
      'heading',
      'description',
      'buttons',
      'slot',
      'background',
    ])
    expect(visible({ variant: 'split' })).toEqual([
      'eyebrow',
      'heading',
      'description',
      'buttons',
      'slot',
      'image',
    ])
    expect(visible({ variant: 'editorial', secondaryImage: picture })).toContain('image')
    expect(visible({ variant: 'editorial' })).not.toContain('image')
    expect(visible({ variant: 'split', eyebrow: '', ctas: [], supporting: [] })).toEqual([
      'heading',
      'description',
      'image',
    ])
  })

  it('offers every row when it cannot find the section', () => {
    const context = { document: {}, path: ['nowhere'], parent: { enabled: true } }
    for (const part of HERO_PARTS) expect(isHidden(`${part}Preset`, context)).toBe(false)
  })
})
