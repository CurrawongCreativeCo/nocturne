import type { FullSection, PageSection } from '../types'

/** What every section has, content or not (see `FullSection`). */
const STUB_KEYS = new Set(['_key', '_type', 'access', 'sharedSectionId'])

/**
 * Whether a section came back with its content, rather than as the stub a members-only section is
 * in the public query. A section with content always has some field beyond the stub's four.
 */
export function hasContent(section: PageSection): section is FullSection {
  return Object.keys(section).some((key) => !STUB_KEYS.has(key))
}
