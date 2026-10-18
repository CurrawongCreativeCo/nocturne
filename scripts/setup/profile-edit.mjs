/**
 * Pure text edit of `site.profile.ts` for the setup wizard (no I/O), kept apart from index.mjs so it
 * can be unit-tested. Deleted together with the rest of scripts/setup/.
 *
 * The profile is a TypeScript file people edit by hand, so this changes one line and leaves every
 * other character as it was: a round trip of the text, never a re-print of the object.
 */

export const PRELAUNCH_LAUNCH = { status: 'prelaunch', homepage: 'links' }

/** `launch: { status: 'prelaunch', homepage: 'links' },` */
export function launchLine({ status, homepage }) {
  return `launch: { status: '${status}', homepage: '${homepage}' },`
}

const ACTIVE = /^([ \t]*)launch:[ \t]*\{[^\n]*\},?[ \t]*$/m
const COMMENTED = /^([ \t]*)\/\/[ \t]*launch:[ \t]*\{[^\n]*\},?[ \t]*$/m
const ANCHOR = /^([ \t]*)clientSections:/m

/**
 * Sets the profile's launch block. An active `launch:` line is replaced, the commented-out example
 * that ships in the template is turned on, and failing both the line goes in above `clientSections`.
 * Returns `{ ok: true, text, changed }`, or `{ ok: false, reason }` when the file has none of these
 * (a block spread over several lines is left for a person to edit, never guessed at).
 */
export function setLaunchInProfile(text, launch = PRELAUNCH_LAUNCH) {
  const line = launchLine(launch)
  for (const pattern of [ACTIVE, COMMENTED]) {
    const match = pattern.exec(text)
    if (match) {
      const next = text.replace(pattern, `${match[1]}${line}`)
      return { ok: true, text: next, changed: next !== text }
    }
  }
  if (/^[ \t]*launch:[ \t]*\{[ \t]*$/m.test(text)) {
    return { ok: false, reason: 'The launch block in site.profile.ts spans several lines.' }
  }
  const anchor = ANCHOR.exec(text)
  if (!anchor) {
    return { ok: false, reason: 'No clientSections line in site.profile.ts to add launch above.' }
  }
  const next = text.replace(ANCHOR, `${anchor[1]}${line}\n${anchor[0]}`)
  return { ok: true, text: next, changed: true }
}
