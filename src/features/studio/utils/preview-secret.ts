import type { SanityClient } from '@sanity/client'
import { createPreviewSecret } from '@sanity/preview-url-secret/create-secret'

/** Shown in the secret document's `source`, so it is clear which tool made it. */
const SOURCE = 'nocturne/structure-preview'
/** A secret lasts an hour (the package's SECRET_TTL); one with less than this left is replaced. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000

type Secret = Awaited<ReturnType<typeof createPreviewSecret>>

const cache = new Map<string, Promise<Secret>>()

/**
 * A preview secret for the site's enable route. It makes the same `sanity.previewUrlSecret`
 * document Presentation does, and is reused until it is nearly out of date, so opening several
 * pages in a row writes one document rather than one per page. `createPreviewSecret` is marked
 * `@internal` in @sanity/preview-url-secret (the package is pinned to an exact version for that
 * reason; preview-secret.test.ts pins the document it writes).
 */
export function getPreviewSecret(
  client: SanityClient,
  studioUrl: string,
  userId: string | undefined,
  { fresh = false, now = Date.now() } = {},
): Promise<string> {
  const { projectId, dataset } = client.config()
  const key = `${String(projectId)}/${String(dataset)}/${userId ?? ''}`
  const cached = cache.get(key)
  const reusable =
    !fresh && cached
      ? cached.then((secret) => secret.expiresAt.getTime() - now > REFRESH_MARGIN_MS)
      : Promise.resolve(false)
  const made = reusable.then((ok) => {
    if (ok && cached) return cached
    const next = createPreviewSecret(client, SOURCE, studioUrl, userId)
    cache.set(key, next)
    // A failed attempt must not be remembered, or "Try again" would get the same rejection.
    next.catch(() => {
      if (cache.get(key) === next) cache.delete(key)
    })
    return next
  })
  return made.then((secret) => secret.secret)
}

/** For tests. */
export function clearPreviewSecrets() {
  cache.clear()
}
