import { describe, expect, it } from 'vitest'

import { swapClasses } from './swap-classes'

describe('swapClasses', () => {
  it('returns the classes untouched, in order, when nothing changed', () => {
    expect(swapClasses('z a  m', 'a', 'a')).toBe('z a  m')
  })

  it('replaces only the own classes', () => {
    expect(swapClasses('flex bg-a p-8 ring-1', 'bg-a ring-1', 'bg-b')).toBe('flex p-8 bg-b')
  })

  it('keeps a class it doesn’t own', () => {
    expect(swapClasses('text-a font-b', 'text-a extra', 'text-c')).toBe('font-b text-c')
  })
})
