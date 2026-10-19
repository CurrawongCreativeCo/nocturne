import { describe, expect, it } from 'vitest'

import { versionsToDelete } from './delete-versions'

describe('versionsToDelete', () => {
  it('names the draft of a page that was never published', () => {
    expect(versionsToDelete(['drafts.about'], 'drafts.about')).toEqual(['drafts.about'])
  })
  it('names the draft of a published page with unpublished edits', () => {
    expect(versionsToDelete(['home', 'drafts.home'], 'drafts.home')).toEqual([
      'drafts.home',
      'home',
    ])
  })
  it('keeps release versions so none is left behind', () => {
    expect(
      versionsToDelete(['home', 'drafts.home', 'versions.rSummer.home'], 'drafts.home'),
    ).toEqual(['drafts.home', 'home', 'versions.rSummer.home'])
  })
  it('still names the open draft when the version list is empty or behind', () => {
    expect(versionsToDelete([], 'drafts.about')).toEqual(['drafts.about'])
  })
  it('passes a published-only page through; the operation ignores the published id', () => {
    expect(versionsToDelete(['home'])).toEqual(['home'])
  })
})
