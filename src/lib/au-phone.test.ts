import { describe, expect, it } from 'vitest'

import { parseAuPhone } from './au-phone'

describe('parseAuPhone', () => {
  it('turns local formats into an international number', () => {
    expect(parseAuPhone('(02) 9876 5432')?.href).toBe('+61298765432')
    expect(parseAuPhone('0412 345 678')?.telephone).toBe('+61412345678')
    expect(parseAuPhone('+61 3 9876 5432')?.href).toBe('+61398765432')
  })

  it('keeps 13 and 1300 numbers as dialled in Australia', () => {
    expect(parseAuPhone('1300 123 456')).toEqual({ href: '1300123456', telephone: '1300123456' })
    expect(parseAuPhone('13 12 34')?.href).toBe('131234')
  })

  it('rejects anything else', () => {
    expect(parseAuPhone('')).toBeNull()
    expect(parseAuPhone('9876 5432')).toBeNull()
    expect(parseAuPhone('0512 345 678')).toBeNull()
    expect(parseAuPhone('call us')).toBeNull()
  })
})
