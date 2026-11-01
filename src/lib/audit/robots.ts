/**
 * robots.txt and robots-directive reading for the page rules. `parseRobots` in
 * scripts/launch-check/seo.mjs turns the file into groups; this decides what the groups allow and
 * reads the `robots` meta tag and `X-Robots-Tag` header. Pure.
 */
import type { RobotsGroup } from './types'

/** A robots.txt path pattern (`*` matches anything, a trailing `$` anchors the end) as a RegExp. */
function patternToRegExp(pattern: string): RegExp {
  const anchored = pattern.endsWith('$')
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .replace(/[.+?^{}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
  return new RegExp(`^${body}${anchored ? '$' : ''}`)
}

/**
 * Whether `agent` may fetch `path`. The group that names the agent most specifically wins, else `*`;
 * within it the longest matching rule wins and Allow beats Disallow on a tie (Google's documented
 * behaviour). No group, or no matching rule, means allowed.
 */
export function isAllowed(groups: readonly RobotsGroup[], agent: string, path: string): boolean {
  const name = agent.toLowerCase()
  const named = groups.filter((group) => group.agents.includes(name))
  const applicable = named.length > 0 ? named : groups.filter((group) => group.agents.includes('*'))
  let best: { length: number; allow: boolean } | null = null
  for (const group of applicable) {
    const rules = [
      ...group.allow.map((rule) => ({ rule, allow: true })),
      ...group.disallow.map((rule) => ({ rule, allow: false })),
    ]
    for (const { rule, allow } of rules) {
      // An empty Disallow means "nothing is disallowed".
      if (rule === '' || !patternToRegExp(rule).test(path)) continue
      if (!best || rule.length > best.length || (rule.length === best.length && allow)) {
        best = { length: rule.length, allow }
      }
    }
  }
  return best?.allow ?? true
}

/** Directives that take a value; any other "word:" prefix names a crawler. */
const WITH_VALUE = /^(max-snippet|max-image-preview|max-video-preview|unavailable_after)\s*:/

export interface RobotsDirectives {
  nosnippet: boolean
  /** The smallest `max-snippet` given (-1 means no limit, and is the same as saying nothing). */
  maxSnippet: number | null
}

/**
 * `nosnippet` and `max-snippet:N` in the robots meta tag and `X-Robots-Tag` header. A directive may
 * be prefixed with a crawler ("googlebot: nosnippet"); any crawler's counts, since the audit cannot
 * know which one matters. `max-snippet:-1` lifts the limit and is ignored.
 */
export function readDirectives(...values: readonly string[]): RobotsDirectives {
  let nosnippet = false
  let maxSnippet: number | null = null
  for (const value of values) {
    for (const part of value.toLowerCase().split(',')) {
      let directive = part.trim()
      if (!WITH_VALUE.test(directive)) directive = directive.replace(/^[a-z0-9_-]+\s*:\s*/, '')
      if (directive === 'nosnippet') nosnippet = true
      const limit = /^max-snippet\s*:\s*(-?\d+)$/.exec(directive)
      if (limit) {
        const n = Number(limit[1])
        if (n >= 0) maxSnippet = maxSnippet === null ? n : Math.min(maxSnippet, n)
      }
    }
  }
  return { nosnippet: nosnippet || maxSnippet === 0, maxSnippet }
}
