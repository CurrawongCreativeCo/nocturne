import stamp from '../../template-version.json'

/**
 * Which release of the Currawong template this site was last updated to. `template-version.json` at
 * the repo root is the one place it is written (`npm run release` updates it, and CI checks it
 * against CHANGELOG.md). A client site keeps the file as merged, so it reports the template
 * version it was last brought up to, not its own.
 */
export const templateVersion: string = stamp.version
export const templateReleased: string = stamp.released
