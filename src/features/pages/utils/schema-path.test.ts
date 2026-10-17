import { describe, expect, it } from 'vitest'

import { enclosingOfArray, valueAtPath } from './schema-path'

const document = {
  pageBuilder: [
    { _key: 'a', _type: 'hero' },
    {
      _key: 'b',
      _type: 'linkList',
      variant: 'compact',
      links: [
        { _key: 'x', label: 'One' },
        { _key: 'y', label: 'Two' },
      ],
    },
  ],
}

describe('valueAtPath', () => {
  it('follows names, keys and positions', () => {
    expect(valueAtPath(document, ['pageBuilder', { _key: 'b' }, 'variant'])).toBe('compact')
    expect(valueAtPath(document, ['pageBuilder', 1, 'links', { _key: 'y' }, 'label'])).toBe('Two')
  })

  it('is undefined for a missing step', () => {
    expect(valueAtPath(document, ['pageBuilder', { _key: 'zzz' }, 'variant'])).toBeUndefined()
    expect(valueAtPath(document, ['nope', 'deeper'])).toBeUndefined()
    expect(valueAtPath(undefined, ['a'])).toBeUndefined()
  })
})

describe('enclosingOfArray', () => {
  it('finds the section a link’s field sits in', () => {
    const path = ['pageBuilder', { _key: 'b' }, 'links', { _key: 'x' }, 'thumbnail']
    expect(enclosingOfArray(document, path, 'links')?.variant).toBe('compact')
  })

  it('is undefined when the path is not inside that array', () => {
    expect(enclosingOfArray(document, ['pageBuilder', { _key: 'a' }, 'title'], 'links')).toBe(
      undefined,
    )
  })
})
