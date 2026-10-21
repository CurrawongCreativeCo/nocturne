import { EVENTS_PATH } from '@/config/event-paths'
import {
  BLOG_PATH,
  EXPERIMENT_PATH,
  GALLERY_PATH,
  PRELAUNCH_VIEW_PATH,
  SEARCH_PATH,
  SIGN_IN_PATH,
  SIGN_OUT_PATH,
  STUDIO_BRAND_PREVIEW_PATH,
  TEAM_PATH,
} from '@/config/paths'

import { isHtmlPagePath } from './prelaunch-gate'

/** CMS page paths, shared by the proxy's A/B tests and Presentation's catch-all resolver. */
export function isPagePath(pathname: string): boolean {
  if (!pathname.startsWith('/') || !isHtmlPagePath(pathname)) return false
  if (pathname.startsWith(`${TEAM_PATH}/`) || pathname.startsWith(`${EVENTS_PATH}/`)) return false
  return ![
    '/api',
    '/studio',
    '/_next',
    '/sitemap',
    BLOG_PATH,
    EXPERIMENT_PATH,
    GALLERY_PATH,
    PRELAUNCH_VIEW_PATH,
    SEARCH_PATH,
    SIGN_IN_PATH,
    SIGN_OUT_PATH,
    STUDIO_BRAND_PREVIEW_PATH,
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
