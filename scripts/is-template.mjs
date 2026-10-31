/**
 * Whether this checkout is the template itself rather than a client site made from it. A client
 * renames the package when the project is set up, and customises site.profile.ts and
 * studio-brand.json on purpose. Tests that assert what the template SHIPS (a bare brand file, the
 * commented-out launch example, a profile with no service features) run only here; on a client site
 * they would fail for the right reasons. Dependency-free so .mjs and TypeScript tests can share it.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const TEMPLATE_PACKAGE_NAME = 'nocturne'

/** `root` is the repository root (default: the directory tests run in). False if unreadable. */
export function isTemplateRepo(root = process.cwd()) {
  try {
    return (
      JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).name === TEMPLATE_PACKAGE_NAME
    )
  } catch {
    return false
  }
}
