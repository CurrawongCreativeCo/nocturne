import { existsSync, readFileSync } from 'node:fs'

import type { BrowserContext } from '@playwright/test'

export const DATASET = 'studio-perf'
export const ORIGIN = 'http://localhost:3200'
export const AUTH_FILE = 'tests/studio-perf/.auth/state.json'
export const API_VERSION = '2026-10-01'

/** No default project, dataset override, remote app URL or CI execution. */
export function assertTarget(
  env: NodeJS.ProcessEnv = process.env,
  denied: unknown = JSON.parse(
    readFileSync(new URL('./denied-projects.json', import.meta.url), 'utf8'),
  ),
): string {
  if (env.CI) throw new Error('Studio performance checks are local only; CI is refused.')
  if (
    !Array.isArray(denied) ||
    denied.length === 0 ||
    !denied.every((id) => typeof id === 'string' && /^[a-z0-9]+$/.test(id))
  ) {
    throw new Error('The project deny list must be a non-empty array of project IDs.')
  }
  const project = env.STUDIO_PERF_PROJECT_ID
  if (!project || !/^[a-z0-9]+$/.test(project))
    throw new Error('Set STUDIO_PERF_PROJECT_ID to a throwaway project ID.')
  if (denied.includes(project)) throw new Error('Refusing a denied Sanity project.')
  if (env.STUDIO_PERF_CONFIRM_PROJECT_ID !== project)
    throw new Error('STUDIO_PERF_CONFIRM_PROJECT_ID must match the throwaway project ID.')
  const normalProjects = ['.env', '.env.local', '.env.production', '.env.production.local']
    .filter((path) => existsSync(path))
    .flatMap((path) =>
      [
        ...readFileSync(path, 'utf8').matchAll(
          /^\s*(?:export\s+)?NEXT_PUBLIC_SANITY_PROJECT_ID\s*=\s*["']?([a-z0-9]+)/gm,
        ),
      ].map((match) => match[1]),
    )
  if (normalProjects.includes(project))
    throw new Error('Refusing a project configured in the normal site environment files.')
  if (env.NEXT_PUBLIC_SANITY_PROJECT_ID === project)
    throw new Error('Refusing the normal site project; use a separate throwaway project.')
  return project
}

export function apiUrl(project: string, path: string): string {
  return `https://${project}.api.sanity.io/v${API_VERSION}/${path}`
}

/** Only these credentials are used for the throwaway build, never the site's normal tokens. */
export function appEnv(): NodeJS.ProcessEnv {
  const project = assertTarget()
  const token = process.env.STUDIO_PERF_READ_TOKEN
  if (!token)
    throw new Error('Set STUDIO_PERF_READ_TOKEN to a Viewer token for the throwaway project.')
  return {
    ...process.env,
    NEXT_PUBLIC_SANITY_PROJECT_ID: project,
    NEXT_PUBLIC_SANITY_DATASET: DATASET,
    NEXT_PUBLIC_SITE_URL: ORIGIN,
    NEXT_DIST_DIR: 'node_modules/.cache/studio-perf',
    // The site client turns off the project hostname when this is set (the e2e fake lake), so
    // the real API needs the project in the host itself.
    SANITY_API_HOST: `https://${project}.api.sanity.io`,
    SANITY_API_READ_TOKEN: token,
    SANITY_API_WRITE_TOKEN: '',
    SANITY_WRITE_TOKEN: '',
    SANITY_REVALIDATE_SECRET: '',
    SITE_LAUNCH_OVERRIDE: '',
    E2E_GALLERY: '',
    SENTRY_DSN: '',
  }
}

/**
 * Blocks accidental cross-project Content Lake access, including mutations from Studio plugins:
 * any request to another project or dataset is aborted and fails the test.
 */
export async function blockOtherProjects(context: BrowserContext, project: string) {
  await context.route(/https:\/\/[^/]*sanity\.io\//, async (route) => {
    const url = new URL(route.request().url())
    const hostProject = /^([a-z0-9]+)\.(?:api|apicdn)\.sanity\.io$/.exec(url.hostname)?.[1]
    // Live events put the dataset after an extra `events` segment.
    const datasetMatch =
      /\/(?:data\/(?:query|mutate|listen|doc)|data\/live\/events|assets\/(?:images|files))\/([^/]+)/.exec(
        url.pathname,
      )
    const dataset = datasetMatch?.[1]
    if ((hostProject && hostProject !== project) || (dataset && dataset !== DATASET)) {
      await route.abort()
      throw new Error(
        `Blocked a request outside the throwaway project/dataset: ${url.hostname}${url.pathname}`,
      )
    }
    await route.continue()
  })
}
