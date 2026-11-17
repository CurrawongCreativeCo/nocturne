import { describe, expect, it } from 'vitest'

import type { DesignOverrides } from '@/lib/color/resolve-design-tokens'

import { designSettings } from './design-settings'

/** Runs a field's validation with a stub that records each rule's level and function. */
function levels(field: string, document: DesignOverrides) {
  interface Recorded {
    fn: (value: unknown, context: unknown) => unknown
    level: string
  }
  const stub = {
    custom: (fn: Recorded['fn']) => {
      const recorded: Recorded & { error: () => Recorded; warning: () => Recorded } = {
        fn,
        level: '',
        error: () => ((recorded.level = 'error'), recorded),
        warning: () => ((recorded.level = 'warning'), recorded),
      }
      return recorded
    },
  }
  const definition = designSettings.fields.find((item) => item.name === field) as unknown as {
    validation: (rule: typeof stub) => Recorded[]
  }
  const value = (document as Record<string, unknown>)[field]
  return definition.validation(stub).map((rule) => ({
    level: rule.level,
    result: rule.fn(value, { document }),
  }))
}

describe('Brand colours validation', () => {
  it('blocks an explicitly chosen failing pair, naming the fix', () => {
    const result = levels('ink', { surface: '#ffffff', ink: '#bbbbbb' })
    const blocking = result.filter((item) => item.level === 'error' && item.result !== true)
    expect(blocking).toHaveLength(1)
    expect(blocking[0]?.result).toContain('use the suggested colour')
    // …and is not also repeated as a warning.
    expect(result.filter((item) => item.level === 'warning' && item.result !== true)).toEqual([])
  })

  it('only warns when the background is not the editor’s choice', () => {
    const result = levels('ink', { ink: '#bbbbbb' })
    expect(result.filter((item) => item.level === 'error' && item.result !== true)).toEqual([])
    expect(result.filter((item) => item.level === 'warning' && item.result !== true)).toHaveLength(
      1,
    )
  })

  it('passes a pair that meets AA, and never blocks Primary, Secondary or Highlight', () => {
    expect(
      levels('ink', { surface: '#ffffff', ink: '#222222' }).filter((item) => item.result !== true),
    ).toEqual([])
    const primary = levels('primary', { primary: '#ffd166' })
    expect(primary.filter((item) => item.level === 'error' && item.result !== true)).toEqual([])
    expect(primary.filter((item) => item.level === 'warning' && item.result !== true)).toHaveLength(
      1,
    )
  })
})
