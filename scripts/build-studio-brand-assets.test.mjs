import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { buildAssets, listBrandImages, paths } from './build-studio-brand-assets.mjs'

describe('studio brand asset map generator', () => {
  it('writes a file equal to the committed one (run `npm run brand-assets` if this fails)', () => {
    expect(readFileSync(paths.out, 'utf8')).toBe(buildAssets(listBrandImages()))
  })

  it("lists Currawong's logo files", () => {
    expect(listBrandImages()).toContain('src/assets/brand/currawong/logo-horizontal-on-light.webp')
  })

  it('maps each repo path to an import', () => {
    const source = buildAssets(['src/assets/brand/client/logo.svg'])
    expect(source).toContain("import image0 from '../../assets/brand/client/logo.svg'")
    expect(source).toContain("'src/assets/brand/client/logo.svg': image0,")
  })

  it('is still valid with no images', () => {
    expect(buildAssets([])).toContain('export const brandAssets: Record<string, BrandImage> = {\n}')
  })
})
