import type { DocumentActionsResolver, NewDocumentOptionsResolver, Template } from 'sanity'

/**
 * Document types that exist exactly once, at `_id === type name` (opened from the
 * desk structure). They can't be created, duplicated or deleted from the UI.
 */
export const SINGLETON_TYPES = new Set([
  'siteIdentity',
  'siteNavigation',
  'announcement',
  'cookieBanner',
  'designSettings',
  // new-singleton:register
])

const SINGLETON_ACTIONS = new Set(['publish', 'discardChanges', 'restore'])

export const singletonDocumentActions: DocumentActionsResolver = (prev, { schemaType }) =>
  SINGLETON_TYPES.has(schemaType)
    ? prev.filter(({ action }) => action && SINGLETON_ACTIONS.has(action))
    : prev

export const hideSingletonsFromNewMenu: NewDocumentOptionsResolver = (prev, { creationContext }) =>
  creationContext.type === 'global'
    ? prev.filter((item) => !SINGLETON_TYPES.has(item.templateId))
    : prev

export function withoutSingletonTemplates(templates: Template[]): Template[] {
  return templates.filter(({ schemaType }) => !SINGLETON_TYPES.has(schemaType))
}
