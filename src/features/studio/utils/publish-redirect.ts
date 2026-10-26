/**
 * Pure logic behind the confirm-publish action: whether publishing changes a document's address
 * (src/lib/sanity/document-address.ts) and the redirect to leave behind. No Studio imports, so it can be
 * unit tested; `actions/confirm-publish.tsx` does the reading and writing.
 */
import { normalizePath } from '@/lib/redirects'
import type { AddressChange } from '@/lib/sanity/document-address'

import { findRedirectProblems, type RedirectRule } from '../content-health/utils/detect'

/** Document types the confirm-publish action covers: the ones with a public address. */
export const CONFIRMED_PUBLISH_TYPES = new Set(['page', 'post'])

/**
 * Whether Publish asks first: for a first publish (the address goes live) and for an address
 * change (the redirect choice). An edit to a live page at the same address publishes straight away.
 */
export function needsPublishConfirmation(
  hasPublished: boolean,
  change: AddressChange | null,
): boolean {
  return !hasPublished || change !== null
}

export type RedirectPlan =
  /** Safe to create. `chained` are redirects that already point at the old address and will take an extra hop. */
  | { kind: 'create'; chained: string[] }
  /** A redirect from the old address already exists. */
  | { kind: 'duplicate'; destination: string }
  /** The new redirect would send visitors round in circles. */
  | { kind: 'loop'; path: string[] }

const NEW_RULE_ID = 'new-redirect'

/** Applies the redirect document's rules (no duplicate source, no loop) to the new redirect. */
export function planRedirect(existing: RedirectRule[], change: AddressChange): RedirectPlan {
  const source = normalizePath(change.from)
  const duplicate = existing.find((rule) => normalizePath(rule.source) === source)
  if (duplicate) return { kind: 'duplicate', destination: duplicate.destination }

  const rule: RedirectRule = { id: NEW_RULE_ID, source: change.from, destination: change.to }
  const loop = findRedirectProblems([...existing, rule]).find(
    ({ id, kind, path }) =>
      id === NEW_RULE_ID && kind === 'loop' && normalizePath(path.at(-1) ?? '') === source,
  )
  if (loop) return { kind: 'loop', path: loop.path }

  return {
    kind: 'create',
    chained: existing
      .filter(({ destination }) => normalizePath(destination) === source)
      .map(({ source: from }) => from),
  }
}

/** The redirect document to publish: old address -> new address, permanent (308). */
export function buildRedirectDocument({ from, to }: AddressChange) {
  return { _type: 'redirect' as const, source: from, destination: to, permanent: true }
}
