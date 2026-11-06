import { createRequire } from 'node:module'

// jsdom (a dev dependency the Studio tests already use) ships no types: type the one call made.
const load = createRequire(import.meta.url)
const { JSDOM } = load('jsdom') as {
  JSDOM: new (html: string) => { window: { document: Document } }
}

/**
 * The shared evidence harness (task 275): compares a component's output with a capability unset and
 * with a probe value, at the element an evidence entry registers. Test support only: the tests import
 * it, never the site or the Studio (it loads jsdom).
 */

/** What became of the registered element under the probe. */
export type TargetStatus = 'changed' | 'ignored' | 'missing'

export interface TargetComparison {
  status: TargetStatus
  /** The element(s) with the capability unset, for the committed snapshot. */
  unset: readonly string[]
}

/** An element as the comparison sees it: its tag and attributes, or all of it. */
function describe(element: Element, change: 'attributes' | 'content'): string {
  if (change === 'content') return element.outerHTML
  const attributes = [...element.attributes]
    .map(({ name, value }) => `${name}="${value}"`)
    .sort()
    .join(' ')
  return `<${element.tagName.toLowerCase()}${attributes ? ` ${attributes}` : ''}>`
}

function select(html: string, target: string, change: 'attributes' | 'content'): string[] {
  const { document } = new JSDOM(`<!doctype html><html><body>${html}</body></html>`).window
  return [...document.querySelectorAll(target)].map((element) => describe(element, change))
}

/**
 * Whether the probe changed the target. The target must exist with the capability unset and with the
 * probe: a missing element is never "unchanged", it is a broken claim.
 */
export function compareTarget(
  unsetHtml: string,
  probeHtml: string,
  target: string,
  change: 'attributes' | 'content',
): TargetComparison {
  const unset = select(unsetHtml, target, change)
  const probed = select(probeHtml, target, change)
  if (unset.length === 0 || probed.length === 0) return { status: 'missing', unset }
  const same = unset.length === probed.length && unset.every((value, i) => value === probed[i])
  return { status: same ? 'ignored' : 'changed', unset }
}
