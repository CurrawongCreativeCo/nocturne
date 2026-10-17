import { describe, expect, it } from 'vitest'

import { enquiriesTitle, newEnquiriesMessage } from './wording'

describe('enquiriesTitle', () => {
  it('adds the number of new enquiries', () => {
    expect(enquiriesTitle(0)).toBe('Enquiries')
    expect(enquiriesTitle(3)).toBe('Enquiries (3 new)')
  })
})

describe('newEnquiriesMessage', () => {
  it('says how many are waiting', () => {
    expect(newEnquiriesMessage(0)).toBe('No new enquiries')
    expect(newEnquiriesMessage(1)).toBe('1 new enquiry')
    expect(newEnquiriesMessage(12)).toBe('12 new enquiries')
  })
})
