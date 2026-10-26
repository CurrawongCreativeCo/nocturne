import type { Audience } from '../roles'

/** Document types clients may edit but never delete or duplicate. Singletons are added by the caller. */
export const CLIENT_PROTECTED_TYPES = ['page', 'post', 'panel'] as const

const CLIENT_BLOCKED_ACTIONS = new Set(['delete', 'duplicate'])
const CONTRIBUTOR_BLOCKED_ACTIONS = new Set(['publish', 'unpublish'])

interface ActionLike {
  action?: string
}

/**
 * Document actions for the audience. Clients lose Delete and Duplicate on pages, posts and
 * singletons; contributors also lose Publish (Sanity refuses it for them anyway).
 */
export function filterDocumentActions<T extends ActionLike>(
  actions: readonly T[],
  audience: Audience,
  protectedType: boolean,
): T[] {
  return actions.filter(({ action }) => {
    if (!action || audience === 'agency') return true
    if (audience === 'contributor' && CONTRIBUTOR_BLOCKED_ACTIONS.has(action)) return false
    return !(protectedType && CLIENT_BLOCKED_ACTIONS.has(action))
  })
}

interface NewOptionLike {
  templateId: string
}

/**
 * "New document" options for clients: only the allowed template ids (page templates, posts and
 * the blog's authors and categories). Agency staff see every option.
 */
export function filterNewDocumentOptions<T extends NewOptionLike>(
  options: readonly T[],
  audience: Audience,
  allowedTemplateIds: ReadonlySet<string>,
): T[] {
  return audience === 'agency'
    ? [...options]
    : options.filter((option) => allowedTemplateIds.has(option.templateId))
}

/** What a Contributor is told where Publish would be. */
export const CONTRIBUTOR_MESSAGE =
  'Your changes are saved as a draft and sent to Currawong to publish.'

/**
 * For contributors, swaps the Publish action for `replacement` (the message above), in the same
 * place. Everyone else keeps their actions as they were.
 */
export function replacePublishForContributor<T extends ActionLike>(
  actions: readonly T[],
  audience: Audience,
  replacement: T,
): T[] {
  return audience === 'contributor'
    ? actions.map((action) => (action.action === 'publish' ? replacement : action))
    : [...actions]
}
