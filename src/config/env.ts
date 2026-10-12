/**
 * Single source of truth for Sanity configuration. Shared by the Next.js app,
 * the embedded Studio, and the Sanity CLI.
 *
 * Env vars must be referenced as literal `process.env.NEXT_PUBLIC_*` expressions
 * so Next.js can inline them into client bundles.
 */

export const projectId = assertValue(
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  'Missing environment variable: NEXT_PUBLIC_SANITY_PROJECT_ID',
)

export const dataset = assertValue(
  process.env.NEXT_PUBLIC_SANITY_DATASET,
  'Missing environment variable: NEXT_PUBLIC_SANITY_DATASET',
)

/** Pin a date; bump deliberately. @see https://www.sanity.io/docs/api-versioning */
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2026-10-01'

/** Where the embedded Studio is mounted. Must match `basePath` in sanity.config.ts. */
export const studioUrl = '/studio'

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

function assertValue<T>(value: T | undefined, errorMessage: string): T {
  if (value === undefined || value === '') throw new Error(errorMessage)
  return value
}
