import { describe, expect, it } from 'vitest'

import { evaluatePublish } from './policy'

/**
 * The Rich text body's divider block (task 151) under the publish gate. `decorativeDivider` is an agency-only
 * type, so the registry's diff finds one added or changed inside the otherwise editable `body`: a
 * Contributor's draft that adds or edits one goes to review. Removing a divider or moving it is a client's
 * content operation (the owner's decision, 11 November 2026), exactly as for a section, so it is allowed.
 * An Editor can still write anything through the API: Sanity has no field-level permissions.
 */

const paragraph = (words: string, key: string) => ({
  _type: 'block',
  _key: key,
  style: 'normal',
  markDefs: [],
  children: [{ _type: 'span', _key: `${key}s`, text: words, marks: [] }],
})
const rule = { _type: 'decorativeDivider', _key: 'd1', style: 'line' }

const page = (body: unknown[]) => ({
  _id: 'page-x',
  _type: 'page',
  title: 'T',
  slug: { _type: 'slug', current: 'x' },
  pageBuilder: [
    {
      _type: 'richText',
      _key: 's1',
      access: 'public',
      style: { _type: 'sectionStyle', tone: 'surface' },
      body,
    },
  ],
})
const verdict = (published: unknown, draft: unknown) =>
  evaluatePublish({
    operation: 'publish',
    type: 'page',
    published: published as Record<string, unknown> | null,
    draft: draft as Record<string, unknown>,
    redirects: [],
    slugHolders: [],
    unverifiedAssets: [],
  })

const plain = page([paragraph('One', 'a'), paragraph('Two', 'b')])
const withRule = page([paragraph('One', 'a'), rule, paragraph('Two', 'b')])

describe('a Rich text body’s divider and the publish gate', () => {
  it('lets an ordinary text edit through', () => {
    expect(verdict(plain, page([paragraph('One!', 'a'), paragraph('Two', 'b')])).outcome).toBe(
      'allow',
    )
  })

  it('sends an added divider to review, naming where it is', () => {
    const result = verdict(plain, withRule)
    expect(result.outcome).toBe('review')
    expect(result.reasons).toHaveLength(1)
    expect(result.reasons[0]).toMatchObject({ kind: 'protected-field' })
    expect(result.reasons[0]?.message).toContain('decorativeDivider')
  })

  it('sends an edited divider to review', () => {
    const edited = page([paragraph('One', 'a'), { ...rule, style: 'dots' }, paragraph('Two', 'b')])
    expect(verdict(withRule, edited).outcome).toBe('review')
  })

  it('sends a pasted copy of a divider to review', () => {
    const copied = page([
      paragraph('One', 'a'),
      rule,
      { ...rule, _key: 'd2' },
      paragraph('Two', 'b'),
    ])
    expect(verdict(withRule, copied).outcome).toBe('review')
  })

  it('sends a first publish that contains a divider to review', () => {
    expect(verdict(null, withRule).outcome).toBe('review')
  })

  it('lets a text edit through when the divider is untouched', () => {
    const edited = page([paragraph('One!', 'a'), rule, paragraph('Two', 'b')])
    expect(verdict(withRule, edited).outcome).toBe('allow')
  })

  it('lets a client remove a divider', () => {
    expect(verdict(withRule, plain).outcome).toBe('allow')
  })

  it('lets a client move a divider', () => {
    const moved = page([paragraph('One', 'a'), paragraph('Two', 'b'), rule])
    expect(verdict(withRule, moved).outcome).toBe('allow')
  })
})
