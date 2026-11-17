import { createRequire } from 'node:module'

import type { ReactElement } from 'react'
import { renderToReadableStream } from 'react-dom/server'

import { TEXT_ROLE_ATTRIBUTE, TEXT_ROLES, type TextRole } from './capabilities'

// jsdom (a dev dependency the Studio tests already use) ships no types: type the one call made. It is
// loaded on first use, so a test that only renders (the section fixtures) doesn't pay for it.
const load = createRequire(import.meta.url)
let dom: (new (html: string) => { window: { document: Document } }) | undefined
const jsdom = () => (dom ??= (load('jsdom') as { JSDOM: NonNullable<typeof dom> }).JSDOM)

/**
 * The HTML React streams for an element, once everything that suspends (async parts, a members-only
 * gate) has finished. A render error is thrown, never swallowed into the HTML. The one renderer the
 * section fixtures and every adapter (a slot block, a listing, a view) share.
 */
export async function renderToHtml(element: ReactElement): Promise<string> {
  const errors: unknown[] = []
  const stream = await renderToReadableStream(element, {
    onError: (error) => {
      errors.push(error)
    },
  })
  await stream.allReady
  const html = await new Response(stream).text()
  if (errors.length > 0) throw errors[0] instanceof Error ? errors[0] : new Error(String(errors[0]))
  return html
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

/**
 * One window for every comparison, its body replaced for each read. A jsdom window costs about a megabyte and
 * a half that is never freed, even closed, so a harness that parsed a window per read (a thousand renders,
 * several reads each) ran its worker out of memory: killed with SIGABRT, the tests after it silently not
 * run. The callback must finish with the document before returning: the next read replaces it.
 */
let shared: Document | undefined
function inDocument<T>(html: string, read: (document: Document) => T): T {
  const JSDOM = jsdom()
  shared ??= new JSDOM('<!doctype html><html><body></body></html>').window.document
  shared.body.innerHTML = html
  try {
    return read(shared)
  } finally {
    shared.body.innerHTML = ''
  }
}

/** Some server-rendered HTML as a document, for tests that read what a component drew. */
export function parseHtml(html: string): Document {
  const JSDOM = jsdom()
  return new JSDOM(`<!doctype html><html><body>${html}</body></html>`).window.document
}

function select(html: string, target: string, change: 'attributes' | 'content'): string[] {
  return inDocument(html, (document) =>
    [...document.querySelectorAll(target)].map((element) => describe(element, change)),
  )
}

/**
 * Whether the probe changed the target. The target must exist with the capability unset and with the
 * probe: a missing element is never "unchanged", it is a broken claim. In `appears` mode the claim is
 * that the probe draws the element at all: it must be absent unset and present with the probe, and an
 * element that is already there unset is a broken claim.
 */
export function compareTarget(
  unsetHtml: string,
  probeHtml: string,
  target: string,
  change: 'attributes' | 'content' | 'appears',
): TargetComparison {
  const mode = change === 'appears' ? 'attributes' : change
  const unset = select(unsetHtml, target, mode)
  const probed = select(probeHtml, target, mode)
  if (change === 'appears') {
    if (unset.length > 0) return { status: 'missing', unset }
    return { status: probed.length > 0 ? 'changed' : 'ignored', unset }
  }
  if (unset.length === 0 || probed.length === 0) return { status: 'missing', unset }
  const same = unset.length === probed.length && unset.every((value, i) => value === probed[i])
  return { status: same ? 'ignored' : 'changed', unset }
}

/**
 * The text roles other than `role` whose elements the probe also changed. A probe for one role must
 * reach that role's element and no other: a role that leaks, or wiring crossed between two roles, shows
 * here even when each role's own target happens to change.
 */
export function leakedTextRoles(unsetHtml: string, probeHtml: string, role: TextRole): TextRole[] {
  const byRole = (html: string) =>
    inDocument(html, (document) => {
      const found = new Map<string, string[]>()
      for (const element of document.querySelectorAll(`[${TEXT_ROLE_ATTRIBUTE}]`)) {
        const name = element.getAttribute(TEXT_ROLE_ATTRIBUTE) ?? ''
        found.set(name, [...(found.get(name) ?? []), element.outerHTML])
      }
      return found
    })
  const before = byRole(unsetHtml)
  const after = byRole(probeHtml)
  return TEXT_ROLES.filter(
    (other) =>
      other !== role && (before.get(other) ?? []).join() !== (after.get(other) ?? []).join(),
  )
}
