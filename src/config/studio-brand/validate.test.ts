import { describe, expect, it } from 'vitest'

import { validateStudioBrand } from './validate'

const errorsOf = (value: unknown, fileExists?: (path: string) => boolean) => {
  const result = validateStudioBrand(value, fileExists)
  return result.ok ? [] : result.errors
}

describe('validateStudioBrand', () => {
  it('accepts {} and a full file', () => {
    expect(validateStudioBrand({}).ok).toBe(true)
    expect(
      validateStudioBrand({
        name: 'Acme Plumbing',
        logo: {
          onLight: 'src/assets/brand/client/logo.svg',
          onDark: 'src/assets/brand/client/logo-dark.svg',
          mark: 'src/assets/brand/client/mark.png',
        },
        colors: { primary: '#1A73E8', secondary: '#ffd400' },
      }).ok,
    ).toBe(true)
  })

  it('rejects anything that is not an object', () => {
    for (const value of [null, [], 'x', 4])
      expect(errorsOf(value)[0]).toMatch(/must be a JSON object/)
  })

  it('names bad hex values', () => {
    const errors = errorsOf({ colors: { primary: 'blue', secondary: '#fff' } })
    expect(errors).toHaveLength(2)
    expect(errors[0]).toMatch(/colors\.primary must be a six-digit hex colour.*"blue"/)
    expect(errors[1]).toMatch(/colors\.secondary must be a six-digit hex colour.*"#fff"/)
    expect(errorsOf({ colors: { primary: '#12345g' } })).toHaveLength(1)
    expect(errorsOf({ colors: { primary: 123 } })).toHaveLength(1)
  })

  it('rejects logo paths outside src/assets/brand/client/', () => {
    const outside = [
      'public/logo.svg',
      'src/assets/brand/currawong/mark.webp',
      '/etc/logo.svg',
      'src/assets/brand/client/../currawong/mark.webp',
      'src/assets/brand/client/../../../secret.svg',
      'src/assets/brand/client/',
      'src/assets/brand/clientele/logo.svg',
      'src\\assets\\brand\\client\\logo.svg',
    ]
    for (const path of outside) {
      expect(errorsOf({ logo: { onLight: path } }), path).toHaveLength(1)
    }
    expect(errorsOf({ logo: { mark: 'public/mark.png' } })[0]).toMatch(
      /logo\.mark must be a file inside src\/assets\/brand\/client\//,
    )
  })

  it('rejects logo files that are not images', () => {
    expect(errorsOf({ logo: { onLight: 'src/assets/brand/client/logo.exe' } })[0]).toMatch(
      /svg, png/,
    )
  })

  it('rejects unknown fields and wrong types', () => {
    expect(errorsOf({ colours: {} })[0]).toMatch(/colours is not a known field/)
    expect(errorsOf({ logo: { dark: 'x' } })[0]).toMatch(/logo\.dark is not a known field/)
    expect(errorsOf({ colors: { accent: '#ffffff' } })[0]).toMatch(
      /colors\.accent is not a known field/,
    )
    expect(errorsOf({ name: '  ' })[0]).toMatch(/name must be a non-empty string/)
    expect(errorsOf({ logo: 'logo.svg' })[0]).toMatch(/logo must be an object/)
    expect(errorsOf({ colors: '#fff' })[0]).toMatch(/colors must be an object/)
  })

  it('reports every problem at once', () => {
    expect(
      errorsOf({ name: 3, colors: { primary: 'x' }, logo: { onLight: 'a.svg' } }),
    ).toHaveLength(3)
  })

  it('checks that the file exists when asked to', () => {
    const logo = { onLight: 'src/assets/brand/client/missing.svg' }
    expect(errorsOf({ logo }, () => false)[0]).toMatch(
      /no file at src\/assets\/brand\/client\/missing\.svg/,
    )
    expect(errorsOf({ logo }, () => true)).toEqual([])
  })
})
