import { describe, expect, it } from 'vitest'

import {
  CONTRIBUTOR_MESSAGE,
  filterDocumentActions,
  filterNewDocumentOptions,
  replacePublishForContributor,
} from './document-access'

const actions = ['publish', 'unpublish', 'discardChanges', 'duplicate', 'delete', 'restore'].map(
  (action) => ({ action }),
)
const names = (list: { action?: string }[]) => list.map((a) => a.action)

describe('filterDocumentActions', () => {
  it('leaves agency staff with every action', () => {
    expect(filterDocumentActions(actions, 'agency', true)).toEqual(actions)
  })

  it('removes Delete and Duplicate from protected types for editors', () => {
    expect(names(filterDocumentActions(actions, 'editor', true))).toEqual([
      'publish',
      'unpublish',
      'discardChanges',
      'restore',
    ])
  })

  it('leaves other types alone for editors', () => {
    expect(filterDocumentActions(actions, 'editor', false)).toEqual(actions)
  })

  it('also removes Publish and Unpublish for contributors', () => {
    expect(names(filterDocumentActions(actions, 'contributor', true))).toEqual([
      'discardChanges',
      'restore',
    ])
    expect(names(filterDocumentActions(actions, 'contributor', false))).toEqual([
      'discardChanges',
      'duplicate',
      'delete',
      'restore',
    ])
  })

  it('keeps actions that have no name', () => {
    expect(filterDocumentActions([{}], 'editor', true)).toEqual([{}])
  })
})

describe('filterNewDocumentOptions', () => {
  const options = ['page', 'page-landing', 'page-content', 'post', 'form', 'redirect'].map(
    (templateId) => ({ templateId }),
  )
  const allowed = new Set(['page-landing', 'page-content', 'post'])

  it('shows agency staff everything', () => {
    expect(filterNewDocumentOptions(options, 'agency', allowed)).toEqual(options)
  })

  it('limits clients to the page templates and posts', () => {
    expect(filterNewDocumentOptions(options, 'editor', allowed).map((o) => o.templateId)).toEqual([
      'page-landing',
      'page-content',
      'post',
    ])
  })
})

describe('replacePublishForContributor', () => {
  const message: { action?: string; label: string } = { label: CONTRIBUTOR_MESSAGE }

  it('puts the message where Publish was for contributors', () => {
    const result = replacePublishForContributor<{ action?: string }>(
      actions,
      'contributor',
      message,
    )
    expect(result[0]).toBe(message)
    expect(names(result)).toEqual([undefined, ...names(actions).slice(1)])
  })

  it('leaves agency staff and editors with Publish', () => {
    expect(replacePublishForContributor<{ action?: string }>(actions, 'agency', message)).toEqual(
      actions,
    )
    expect(replacePublishForContributor<{ action?: string }>(actions, 'editor', message)).toEqual(
      actions,
    )
  })

  it('survives the contributor filter, which only removes named actions', () => {
    const result = replacePublishForContributor<{ action?: string }>(
      actions,
      'contributor',
      message,
    )
    expect(filterDocumentActions(result, 'contributor', false)).toContain(message)
  })

  it('tells contributors their changes go to Currawong', () => {
    expect(CONTRIBUTOR_MESSAGE).toBe(
      'Your changes are saved as a draft and sent to Currawong to publish.',
    )
  })
})
