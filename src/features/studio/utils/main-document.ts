import type { LaunchState } from '@/config/launch'
import { HOME_SLUG } from '@/config/paths'
import { isPagePath } from '@/lib/page-path'
import { isHtmlPagePath } from '@/lib/prelaunch-gate'

/** Pure URL mapping; no cookies, content reads or launch-dependent page caching. */
export function resolveMainDocument(
  path: string,
  launch: Pick<LaunchState, 'status' | 'homepage'>,
  /** `services/<slug>` and `locations/<slug>` open those documents only while the feature is on; off, they are CMS pages. */
  { services = false, locations = false }: { services?: boolean; locations?: boolean } = {},
) {
  if (!isHtmlPagePath(path)) return undefined
  const segments = ['blog/category', 'blog', 'team', 'events']
  if (services) segments.push('services')
  if (locations) segments.push('locations')
  const detail = new RegExp(`^/(${segments.join('|')})/([^/]+)/?$`).exec(path)
  if (detail?.[2]) {
    const types = {
      'blog/category': 'category',
      blog: 'post',
      team: 'teamMember',
      events: 'event',
      services: 'service',
      locations: 'place',
    }
    const type = types[detail[1] as keyof typeof types]
    return { filter: `_type == "${type}" && slug.current == $slug`, params: { slug: detail[2] } }
  }
  if (!isPagePath(path)) return undefined
  const slug = path.replace(/^\/|\/$/g, '')
  return {
    filter: `_type == "page" && slug.current == $slug`,
    params: { slug: slug || (launch.status === 'prelaunch' ? launch.homepage : HOME_SLUG) },
  }
}
