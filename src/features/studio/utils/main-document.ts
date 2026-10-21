import type { LaunchState } from '@/config/launch'
import { HOME_SLUG } from '@/config/paths'
import { isPagePath } from '@/lib/page-path'
import { isHtmlPagePath } from '@/lib/prelaunch-gate'

/** Pure URL mapping; no cookies, content reads or launch-dependent page caching. */
export function resolveMainDocument(
  path: string,
  launch: Pick<LaunchState, 'status' | 'homepage'>,
) {
  if (!isHtmlPagePath(path)) return undefined
  const detail = /^\/(blog\/category|blog|team|events)\/([^/]+)\/?$/.exec(path)
  if (detail?.[2]) {
    const types = { 'blog/category': 'category', blog: 'post', team: 'teamMember', events: 'event' }
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
