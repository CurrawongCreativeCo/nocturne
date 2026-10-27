import { describe, expect, it } from 'vitest'

import { mergeEnv, normalize, parseEnv, setStudioName } from './validate.mjs'

const existing = { tokenMode: 'paste', projectMode: 'existing' }
const valid = { projectId: 'abc123de', token: 'skVALIDLOOKINGTOKEN1234567890' }

describe('normalize', () => {
  it('accepts valid input and fills defaults', () => {
    const { values, errors } = normalize(valid, existing)
    expect(errors).toEqual({})
    expect(values).toMatchObject({ dataset: 'production', siteUrl: 'http://localhost:3000' })
  })

  it('lowercases the project ID and reduces the site URL to its origin', () => {
    const { values } = normalize(
      { ...valid, projectId: 'ABC123DE', siteUrl: 'https://x.com/a/' },
      existing,
    )
    expect(values.projectId).toBe('abc123de')
    expect(values.siteUrl).toBe('https://x.com')
  })

  it('reports each invalid field', () => {
    const { errors } = normalize(
      { projectId: 'bad id!', dataset: 'Prod', apiVersion: 'nope', siteUrl: 'ftp://x', token: 'x' },
      existing,
    )
    expect(Object.keys(errors).sort()).toEqual([
      'apiVersion',
      'dataset',
      'projectId',
      'siteUrl',
      'token',
    ])
  })

  it('needs a project name, not an ID, when creating a project', () => {
    const create = { tokenMode: 'create', projectMode: 'create' }
    expect(normalize({ projectName: 'Acme Site' }, create).errors).toEqual({})
    expect(normalize({ projectName: '<script>' }, create).errors.projectName).toBeDefined()
  })

  it('defaults the Studio title to the site name, unless one is given', () => {
    const create = { tokenMode: 'create', projectMode: 'create' }
    expect(normalize({ projectName: 'Acme Site' }, create).values.studioTitle).toBe('Acme Site')
    expect(
      normalize({ projectName: 'Acme Site', studioTitle: ' Acme CMS ' }, create).values.studioTitle,
    ).toBe('Acme CMS')
    expect(normalize(valid, existing).values.studioTitle).toBe('')
  })

  it('rejects a Studio title that is too long or has line breaks', () => {
    expect(
      normalize({ ...valid, studioTitle: 'x'.repeat(81) }, existing).errors.studioTitle,
    ).toBeDefined()
    expect(normalize({ ...valid, studioTitle: 'a\nb' }, existing).errors.studioTitle).toBeDefined()
  })

  it('only requires a token when pasting one', () => {
    expect(
      normalize({ projectId: 'abc123de' }, { tokenMode: 'create', projectMode: 'existing' }).errors,
    ).toEqual({})
    expect(normalize({ projectId: 'abc123de' }, existing).errors.token).toBeDefined()
  })
})

describe('.env helpers', () => {
  const values = {
    projectId: 'abc123de',
    dataset: 'production',
    apiVersion: '2026-10-01',
    siteUrl: 'http://localhost:3000',
    studioTitle: 'Acme CMS',
    token: 'skSECRET',
  }

  it('parses quoted and unquoted values', () => {
    expect(parseEnv('A="1"\nB=2\n# comment\nC=\'three\'\n')).toEqual({ A: '1', B: '2', C: 'three' })
  })

  it('writes a new file with a header', () => {
    const text = mergeEnv('', values)
    expect(text.startsWith('# Written by the setup wizard')).toBe(true)
    expect(parseEnv(text)).toMatchObject({
      NEXT_PUBLIC_SANITY_PROJECT_ID: 'abc123de',
      SANITY_API_READ_TOKEN: 'skSECRET',
    })
  })

  it('writes no deprecated setting: the API date is a constant and the name is in studio-brand.json', () => {
    const env = parseEnv(mergeEnv('', values))
    expect(env).not.toHaveProperty('NEXT_PUBLIC_STUDIO_TITLE')
    expect(env).not.toHaveProperty('NEXT_PUBLIC_SANITY_API_VERSION')
  })

  it('still writes an API date someone chose on purpose', () => {
    const env = parseEnv(mergeEnv('', { ...values, apiVersion: '2026-01-01' }))
    expect(env.NEXT_PUBLIC_SANITY_API_VERSION).toBe('2026-01-01')
  })

  it('updates its own keys in place and keeps everything else', () => {
    const before = 'MY_VAR="keep"\nNEXT_PUBLIC_SANITY_PROJECT_ID="old"\n\n# note\n'
    const after = mergeEnv(before, values)
    expect(after).toContain('MY_VAR="keep"')
    expect(after).toContain('# note')
    expect(after.match(/NEXT_PUBLIC_SANITY_PROJECT_ID=/g)).toHaveLength(1)
    expect(parseEnv(after).NEXT_PUBLIC_SANITY_PROJECT_ID).toBe('abc123de')
  })
})

describe('setStudioName', () => {
  const file = '{\n  "$schema": "./studio-brand.schema.json"\n}\n'

  it('adds the name and keeps the rest', () => {
    expect(JSON.parse(setStudioName(file, 'Acme CMS') ?? '')).toEqual({
      $schema: './studio-brand.schema.json',
      name: 'Acme CMS',
    })
  })

  it('keeps a name that is already there, and leaves unreadable text alone', () => {
    const named = '{"name":"Client"}'
    expect(setStudioName(named, 'Acme CMS')).toBe(named)
    expect(setStudioName('not json', 'Acme CMS')).toBeNull()
    expect(setStudioName(file, '')).toBe(file)
  })
})
