import { describe, expect, it } from 'vitest'

import { testimonials } from './testimonials'

describe('Testimonials avatar design', () => {
  const avatars = (
    testimonials.fields as { name: string; hidden?: (c: unknown) => boolean }[]
  ).find((f) => f.name === 'avatarDesign')

  it('is agency only', () => {
    expect(avatars?.hidden?.({ currentUser: { roles: [{ name: 'administrator' }] } })).toBe(false)
    expect(avatars?.hidden?.({ currentUser: { roles: [{ name: 'editor' }] } })).toBe(true)
  })
})
