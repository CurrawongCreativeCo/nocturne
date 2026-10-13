/**
 * Pure helpers for the setup wizard (no I/O), kept apart from index.mjs so they can be
 * unit-tested. Deleted together with the rest of scripts/setup/.
 */

export const DEV_PORT = Number(process.env.PORT) || 3000
export const DEFAULTS = {
  projectName: 'My Site',
  studioTitle: '',
  projectId: '',
  dataset: 'production',
  apiVersion: '2026-10-01',
  siteUrl: `http://localhost:${DEV_PORT}`,
  token: '',
}
export const ENV_KEYS = {
  projectId: 'NEXT_PUBLIC_SANITY_PROJECT_ID',
  dataset: 'NEXT_PUBLIC_SANITY_DATASET',
  apiVersion: 'NEXT_PUBLIC_SANITY_API_VERSION',
  siteUrl: 'NEXT_PUBLIC_SITE_URL',
  studioTitle: 'NEXT_PUBLIC_STUDIO_TITLE',
  token: 'SANITY_API_READ_TOKEN',
}

export function normalize(input, { tokenMode, projectMode }) {
  const str = (key) => String(input[key] ?? '').trim()
  const projectName = str('projectName')
  const values = {
    projectName,
    // Left blank, the Studio title follows the site name; with neither, the app falls back to "Content".
    studioTitle: str('studioTitle') || projectName,
    projectId: str('projectId').toLowerCase(),
    dataset: str('dataset') || DEFAULTS.dataset,
    apiVersion: str('apiVersion') || DEFAULTS.apiVersion,
    siteUrl: str('siteUrl') || DEFAULTS.siteUrl,
    token: str('token'),
  }
  const errors = {}

  if (projectMode === 'create') {
    if (!/^[\p{L}\p{N}][\p{L}\p{N} ._'&-]{0,79}$/u.test(values.projectName))
      errors.projectName = "Use up to 80 letters, numbers, spaces and . _ ' & -"
  } else if (!values.projectId) errors.projectId = 'Enter your project ID.'
  else if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(values.projectId))
    errors.projectId = 'Project IDs are lowercase letters, numbers and dashes, e.g. "a1b2c3d4".'

  if (values.studioTitle.length > 80 || /\p{Cc}/u.test(values.studioTitle))
    errors.studioTitle = 'Use up to 80 characters, with no line breaks.'

  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(values.dataset))
    errors.dataset = 'Dataset names are lowercase letters, numbers, "_" and "-".'

  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.apiVersion) || Number.isNaN(Date.parse(values.apiVersion)))
    errors.apiVersion = 'Use a date in YYYY-MM-DD format.'

  try {
    const url = new URL(values.siteUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error()
    values.siteUrl = url.origin
  } catch {
    errors.siteUrl = 'Enter a full URL, e.g. http://localhost:3000.'
  }

  if (tokenMode === 'paste') {
    if (!values.token) errors.token = 'Paste a token, or let the wizard create one.'
    else if (!/^[A-Za-z0-9._-]{20,}$/.test(values.token))
      errors.token =
        "That doesn't look like a Sanity API token. Copy the whole value shown when you created it."
  }

  return { values, errors }
}

/** Parses KEY=value lines (quotes optional), as .env files are written. */
export function parseEnv(text) {
  const env = {}
  for (const line of text.split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (match) env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2')
  }
  return env
}

/** Updates the wizard's keys in an .env file's text, keeping every other line as it was. */
export function mergeEnv(text, values) {
  const lines = text
    .replace(/\n+$/, '')
    .split('\n')
    .filter((line, i, all) => all.length > 1 || line)
  if (lines.length === 0) {
    lines.push('# Written by the setup wizard. See .env.example for what each value does.')
  }
  for (const [field, key] of Object.entries(ENV_KEYS)) {
    const line = `${key}="${values[field]}"`
    const index = lines.findIndex((l) => new RegExp(`^\\s*${key}\\s*=`).test(l))
    if (index === -1) lines.push(line)
    else lines[index] = line
  }
  return `${lines.join('\n')}\n`
}
