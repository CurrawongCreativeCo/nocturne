import { describe, expect, it } from 'vitest'

import { audienceFor, hiddenFromClients, isAgency, isClientEditor, isContributor } from './roles'

const user = (...names: string[]) => ({ roles: names.map((name) => ({ name })) })

describe('role predicates', () => {
  it('treats administrators and developers as agency staff', () => {
    expect(isAgency(user('administrator'))).toBe(true)
    expect(isAgency(user('developer'))).toBe(true)
    expect(isAgency(user('editor', 'developer'))).toBe(true)
  })

  it('does not treat editors, contributors, viewers or nobody as agency staff', () => {
    expect(isAgency(user('editor'))).toBe(false)
    expect(isAgency(user('contributor'))).toBe(false)
    expect(isAgency(user('viewer'))).toBe(false)
    expect(isAgency(user())).toBe(false)
    expect(isAgency({})).toBe(false)
    expect(isAgency(null)).toBe(false)
  })

  it('recognises contributors only when nothing lets them publish', () => {
    expect(isContributor(user('contributor'))).toBe(true)
    expect(isContributor(user('contributor', 'editor'))).toBe(false)
    expect(isContributor(user('contributor', 'administrator'))).toBe(false)
    expect(isContributor(user('editor'))).toBe(false)
  })

  it('counts everyone who is not agency as a client editor', () => {
    expect(isClientEditor(user('editor'))).toBe(true)
    expect(isClientEditor(user('contributor'))).toBe(true)
    expect(isClientEditor(null)).toBe(true)
    expect(isClientEditor(user('administrator'))).toBe(false)
  })
})

describe('audienceFor', () => {
  it('maps users to an audience', () => {
    expect(audienceFor(user('administrator'))).toBe('agency')
    expect(audienceFor(user('editor'))).toBe('editor')
    expect(audienceFor(user('contributor'))).toBe('contributor')
    expect(audienceFor(null)).toBe('editor')
  })

  it('shows agency staff the editor view while previewing', () => {
    expect(audienceFor(user('developer'), true)).toBe('editor')
  })

  it('ignores the preview for clients', () => {
    expect(audienceFor(user('contributor'), true)).toBe('contributor')
  })
})

describe('hiddenFromClients', () => {
  const context = (u: ReturnType<typeof user> | null) =>
    ({ currentUser: u }) as Parameters<typeof hiddenFromClients>[0]

  it('hides from clients and shows to agency staff', () => {
    expect(hiddenFromClients(context(user('editor')))).toBe(true)
    expect(hiddenFromClients(context(null))).toBe(true)
    expect(hiddenFromClients(context(user('administrator')))).toBe(false)
  })
})
