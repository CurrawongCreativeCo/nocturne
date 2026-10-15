import type { DocumentActionsResolver, DocumentActionComponent, Template } from 'sanity'
import { describe, expect, it } from 'vitest'

import { SINGLETON_TYPES, singletonDocumentActions, withoutSingletonTemplates } from './singletons'

const action = (name: string) =>
  Object.assign(() => null, { action: name }) as DocumentActionComponent
const all = ['publish', 'unpublish', 'delete', 'duplicate', 'discardChanges', 'restore'].map(action)
const resolve = (schemaType: string) =>
  (singletonDocumentActions as (...args: unknown[]) => ReturnType<DocumentActionsResolver>)(all, {
    schemaType,
  }).map((item) => item.action)

describe('site settings singletons', () => {
  it('registers the four Website settings screens', () => {
    for (const type of ['siteIdentity', 'siteNavigation', 'announcement', 'cookieBanner']) {
      expect(SINGLETON_TYPES.has(type)).toBe(true)
    }
  })

  it('leaves them only publish, discard and restore: no delete or duplicate', () => {
    expect(resolve('siteNavigation')).toEqual(['publish', 'discardChanges', 'restore'])
    expect(resolve('page')).toContain('delete')
  })

  it('keeps them out of the New document templates', () => {
    const templates = [{ schemaType: 'cookieBanner' }, { schemaType: 'page' }] as Template[]
    expect(withoutSingletonTemplates(templates)).toEqual([{ schemaType: 'page' }])
  })
})
