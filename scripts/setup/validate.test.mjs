import { describe, expect, it } from 'vitest'

import { mergeEnv, normalize, parseEnv } from './validate.mjs'

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

  it('updates its own keys in place and keeps everything else', () => {
    const before = 'MY_VAR="keep"\nNEXT_PUBLIC_SANITY_PROJECT_ID="old"\n\n# note\n'
    const after = mergeEnv(before, values)
    expect(after).toContain('MY_VAR="keep"')
    expect(after).toContain('# note')
    expect(after.match(/NEXT_PUBLIC_SANITY_PROJECT_ID=/g)).toHaveLength(1)
    expect(parseEnv(after).NEXT_PUBLIC_SANITY_PROJECT_ID).toBe('abc123de')
  })
})
