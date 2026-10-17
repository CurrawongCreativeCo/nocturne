import { describe, expect, it } from 'vitest'

import { getEnquiryConfig, isEnquiryStoreRequested } from './enquiry-config'

describe('getEnquiryConfig', () => {
  it('is off unless ENQUIRIES_STORE is exactly 1', () => {
    expect(getEnquiryConfig({ SANITY_WRITE_TOKEN: 'token' })).toEqual({ enabled: false })
    for (const value of ['', '0', 'true', 'yes', ' 1']) {
      expect(getEnquiryConfig({ ENQUIRIES_STORE: value, SANITY_WRITE_TOKEN: 'token' })).toEqual({
        enabled: false,
      })
    }
  })

  it('is on with the flag and a write token', () => {
    expect(getEnquiryConfig({ ENQUIRIES_STORE: '1', SANITY_WRITE_TOKEN: 'token' })).toEqual({
      enabled: true,
      writeToken: 'token',
    })
  })

  it('stays off, and says why, when the token is missing', () => {
    expect(getEnquiryConfig({ ENQUIRIES_STORE: '1' })).toEqual({
      enabled: false,
      missing: 'SANITY_WRITE_TOKEN',
    })
  })
})

describe('isEnquiryStoreRequested', () => {
  it('reads only the flag', () => {
    expect(isEnquiryStoreRequested({ ENQUIRIES_STORE: '1' })).toBe(true)
    expect(isEnquiryStoreRequested({})).toBe(false)
  })
})
