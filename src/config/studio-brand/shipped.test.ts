import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { currawongBrand } from './currawong'
import { resolveStudioBrand } from './resolve'
import type { StudioBrandFile } from './types'
import { validateStudioBrand } from './validate'
import { isTemplateRepo } from '../../../scripts/is-template.mjs'

interface JsonSchema {
  properties: Record<string, { properties?: Record<string, unknown> }>
}

const read = (file: string): unknown => JSON.parse(readFileSync(join(process.cwd(), file), 'utf8'))

describe('the shipped studio-brand.json', () => {
  const file = read('studio-brand.json') as StudioBrandFile

  it('is valid', () => {
    expect(validateStudioBrand(file).ok).toBe(true)
  })

  // A client's own brand file names the client, on purpose.
  it.skipIf(!isTemplateRepo())(
    'sets nothing but $schema, so a new project is Currawong-branded',
    () => {
      expect(Object.keys(file)).toEqual(['$schema'])
      expect(resolveStudioBrand(file, currawongBrand, {}).source).toBe('currawong')
    },
  )

  it('points at a schema that exists and lists the same fields as the validator', () => {
    const schema = read((file.$schema ?? '').replace('./', '')) as JsonSchema
    expect(Object.keys(schema.properties)).toEqual(['$schema', 'name', 'logo', 'colors'])
    expect(Object.keys(schema.properties.logo?.properties ?? {})).toEqual([
      'onLight',
      'onDark',
      'mark',
    ])
    expect(Object.keys(schema.properties.colors?.properties ?? {})).toEqual([
      'primary',
      'secondary',
    ])
  })

  it('accepts $schema in the validator', () => {
    expect(validateStudioBrand({ $schema: './studio-brand.schema.json' }).ok).toBe(true)
    expect(validateStudioBrand({ $schema: 3 }).ok).toBe(false)
  })
})
