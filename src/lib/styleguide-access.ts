/**
 * Who may open the style guide (`/section-gallery`, README "Style guide"). Pure, so the proxy, the
 * pages and the unit tests share one rule:
 *
 *  - `open`: development and the end-to-end build (E2E_GALLERY=1). No token.
 *  - `token`: a Vercel preview deployment with STYLEGUIDE_PREVIEW_TOKEN set. Visitors need
 *    `?preview=<token>` (the proxy then remembers it in a cookie).
 *  - `closed`: everywhere else, production included. The route answers 404.
 */
export type StyleguideAccess = 'open' | 'token' | 'closed'

export interface StyleguideEnv {
  nodeEnv?: string
  e2eGallery?: string
  /** Vercel's system variable: `production`, `preview` or `development`; unset off Vercel. */
  vercelEnv?: string
  previewToken?: string
}

/** A shorter token is too easy to guess, so it is treated as not set. */
export const MIN_PREVIEW_TOKEN_LENGTH = 16

/** The query parameter that carries the token, and the cookie the proxy keeps it in. */
export const STYLEGUIDE_TOKEN_PARAM = 'preview'
export const STYLEGUIDE_TOKEN_COOKIE = 'styleguide-preview'

export function currentStyleguideEnv(): StyleguideEnv {
  return {
    nodeEnv: process.env.NODE_ENV,
    e2eGallery: process.env.E2E_GALLERY,
    vercelEnv: process.env.VERCEL_ENV,
    previewToken: process.env.STYLEGUIDE_PREVIEW_TOKEN,
  }
}

export function styleguideAccess(env: StyleguideEnv): StyleguideAccess {
  if (env.nodeEnv === 'development' || env.e2eGallery === '1') return 'open'
  const token = env.previewToken ?? ''
  if (env.vercelEnv === 'preview' && token.length >= MIN_PREVIEW_TOKEN_LENGTH) return 'token'
  return 'closed'
}

/** Compares without stopping at the first difference, so response time does not leak the token. */
export function tokenMatches(expected: string | undefined, given: string | null | undefined) {
  if (!expected || expected.length < MIN_PREVIEW_TOKEN_LENGTH || !given) return false
  let difference = expected.length ^ given.length
  for (let i = 0; i < expected.length; i++) {
    difference |= expected.charCodeAt(i) ^ (given.charCodeAt(i) || 0)
  }
  return difference === 0
}

/** The style guide and everything under it (its token page). Not `/section-gallery-x`. */
export function isStyleguidePath(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`)
}

/** Whether a Vercel preview can open the style guide: the token must be long enough to count as set. */
export function getStyleguideReadiness(env: Record<string, string | undefined> = process.env) {
  const token = env.STYLEGUIDE_PREVIEW_TOKEN ?? ''
  return token.length >= MIN_PREVIEW_TOKEN_LENGTH
    ? { ready: true as const }
    : {
        ready: false as const,
        missing: [
          `STYLEGUIDE_PREVIEW_TOKEN (${String(MIN_PREVIEW_TOKEN_LENGTH)} or more characters)`,
        ],
      }
}
