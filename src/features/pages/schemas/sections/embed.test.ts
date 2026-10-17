import { describe, expect, it } from 'vitest'

import { embed } from './embed'

type Rule = Record<string, unknown>
interface Field {
  name: string
  group?: string
  fieldset?: string
  hidden?: (context: Record<string, unknown>) => boolean
  options?: { list?: { value: string }[]; presetPicker?: boolean }
  validation?: (rule: Rule) => unknown
}

const fields = embed.fields as unknown as Field[]
const field = (name: string) => fields.find((f) => f.name === name)
const AGENCY = { currentUser: { roles: [{ name: 'administrator' }] } }
const CLIENT = { currentUser: { roles: [{ name: 'editor' }] } }

/** Runs the field's `rule.custom(fn)` callback the way the Studio does. */
function validateUrl(provider: string | undefined, value: string | undefined) {
  let custom: ((value: unknown, context: unknown) => unknown) | undefined
  const rule: Rule = {
    custom: (fn: typeof custom) => {
      custom = fn
      return rule
    },
  }
  field('url')?.validation?.(rule)
  return custom?.(value, { parent: { provider } })
}

describe('embed section', () => {
  it('offers exactly the approved inline providers', () => {
    expect(field('provider')?.options?.list?.map((o) => o.value)).toEqual([
      'typeform',
      'google-maps',
      'spotify',
    ])
  })

  it('validates the address against the chosen provider', () => {
    expect(validateUrl('typeform', 'https://form.typeform.com/to/AbCd1234')).toBe(true)
    expect(
      validateUrl('typeform', 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M'),
    ).toMatch(/doesn’t look like a Typeform address/)
    expect(validateUrl('typeform', undefined)).toBe('Paste the Typeform address')
    // Nothing to check against until a provider is chosen.
    expect(validateUrl(undefined, 'anything')).toBe(true)
  })

  it('hides the address and height until a provider is chosen', () => {
    for (const name of ['url', 'height', 'customHeight']) {
      expect(field(name)?.hidden?.({ ...AGENCY, parent: {} })).toBe(true)
      expect(field(name)?.hidden?.({ ...AGENCY, parent: { provider: 'typeform' } })).toBe(false)
    }
  })

  it('keeps the exact height in the agency-only Advanced area', () => {
    const custom = field('customHeight')
    expect(custom).toMatchObject({ group: 'design', fieldset: 'advanced' })
    expect(custom?.hidden?.({ ...CLIENT, parent: { provider: 'typeform' } })).toBe(true)
    expect(custom?.hidden?.({ ...AGENCY, parent: { provider: 'typeform' } })).toBe(false)
  })

  it('shows the height presets as a picker and stores nothing until one is chosen', () => {
    const height = field('height') as Field & { initialValue?: unknown }
    expect(height.options?.presetPicker).toBe(true)
    expect(height.options?.list?.map((o) => o.value)).toEqual(['short', 'medium', 'tall'])
    expect(height.initialValue).toBeUndefined()
  })

  it('has no field for markup, scripts or embed code', () => {
    expect(fields.map((f) => f.name)).toEqual([
      'title',
      'text',
      'provider',
      'url',
      'height',
      'access',
      'style',
      'customHeight',
    ])
  })
})
