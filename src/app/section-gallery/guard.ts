import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'

import {
  currentStyleguideEnv,
  STYLEGUIDE_TOKEN_COOKIE,
  STYLEGUIDE_TOKEN_PARAM,
  styleguideAccess,
  tokenMatches,
  type StyleguideAccess,
} from '@/lib/styleguide-access'

/**
 * Who may see the style guide pages (rules in lib/styleguide-access.ts). Production answers 404 at
 * prerender, a real 404 status, so call this before anything else, outside <Suspense>.
 */
export function requireStyleguide(): Exclude<StyleguideAccess, 'closed'> {
  const access = styleguideAccess(currentStyleguideEnv())
  if (access === 'closed') notFound()
  return access
}

/**
 * On a preview deployment the proxy has already turned away requests without the token; this checks
 * again where the content is made, so a route the proxy does not cover is never left open. Request
 * time data, so call it inside <Suspense>.
 */
export async function requireStyleguideToken(
  access: Exclude<StyleguideAccess, 'closed'>,
  searchParams: Promise<Record<string, string | string[] | undefined>>,
): Promise<void> {
  if (access === 'open') return
  const expected = currentStyleguideEnv().previewToken
  const fromUrl = (await searchParams)[STYLEGUIDE_TOKEN_PARAM]
  const fromCookie = (await cookies()).get(STYLEGUIDE_TOKEN_COOKIE)?.value
  const given = [Array.isArray(fromUrl) ? fromUrl[0] : fromUrl, fromCookie]
  if (!given.some((value) => tokenMatches(expected, value))) notFound()
}
