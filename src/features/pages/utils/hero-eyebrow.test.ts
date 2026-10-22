import { describe, expect, it } from 'vitest'

import { resolveHeroEyebrowDesign } from './hero-eyebrow'
import { heroPartsPresent } from './hero-parts'

describe('hero eyebrow labels', () => {
  it('starts with the hero’s small capitals and the inline list’s wrapping bullets', () => {
    expect(resolveHeroEyebrowDesign(undefined)).toEqual({
      separator: 'bullet',
      size: 'small',
      weight: 'semibold',
      textCase: 'uppercase',
      gap: 'comfortable',
      phoneLayout: 'wrap',
      textColour: undefined,
      separatorColour: 'var(--color-accent-text)',
    })
    expect(resolveHeroEyebrowDesign(null)).toEqual(resolveHeroEyebrowDesign({}))
  })

  it('allows separators and colours while keeping typography with the component', () => {
    expect(
      resolveHeroEyebrowDesign({
        separator: 'dot',
        size: 'large',
        weight: 'regular',
        textCase: 'normal',
        textColour: { colour: 'ink' },
        separatorColour: { colour: 'custom', hex: '#654321' },
      }),
    ).toMatchObject({
      separator: 'dot',
      size: 'small',
      weight: 'semibold',
      textCase: 'uppercase',
      textColour: 'var(--color-ink)',
      separatorColour: '#654321',
    })
    expect(resolveHeroEyebrowDesign({ separator: 'invalid' }).separator).toBe('bullet')
  })

  it('offers eyebrow motion for labels alone, but never for an empty list', () => {
    expect(heroPartsPresent({ eyebrowLabels: ['Yoga', 'Pilates'] })).toContain('eyebrow')
    expect(heroPartsPresent({ eyebrowLabels: ['', '  ', null] })).not.toContain('eyebrow')
    expect(heroPartsPresent({ eyebrow: 'Yoga · Pilates · Barre' })).toContain('eyebrow')
  })
})
