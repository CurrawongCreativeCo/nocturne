import 'server-only'

/**
 * Viewer-role token. `server-only` makes importing this from a client component
 * a build error, so it can never leak into a bundle by accident.
 */
export const token = process.env.SANITY_API_READ_TOKEN

if (!token) {
  throw new Error('Missing environment variable: SANITY_API_READ_TOKEN')
}
