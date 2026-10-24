import { describe, expect, it } from 'vitest'

import { backgroundImageClass } from './background-class'

describe('backgroundImageClass', () => {
  it('puts the picture behind the text, as separate classes', () => {
    const classes = backgroundImageClass(false, 'object-cover opacity-40').split(' ')
    expect(classes).toEqual(['-z-10', 'object-cover', 'opacity-40'])
  })

  it('leaves a floating picture to its own stacking', () => {
    expect(backgroundImageClass(true, 'object-cover opacity-40')).toBe('object-cover opacity-40')
  })

  it('is just -z-10 when there are no other classes', () => {
    expect(backgroundImageClass(false, '')).toBe('-z-10')
  })
})
