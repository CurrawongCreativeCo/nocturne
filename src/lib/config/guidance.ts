import type { FeatureSetting } from '@/config/feature-config'

/**
 * What a Settings screen needs to say about a setting, derived from the registry so it can't drift
 * from it. Pure and read-only: nothing here changes a setting (task 232 reads, Foundation will write).
 */

/** Who changes it today. `foundation` only when the entry says so; nothing writes it yet. */
export function managedBy(setting: FeatureSetting): 'local' | 'provider' | 'foundation' {
  if (setting.managedBy) return setting.managedBy
  return setting.where === 'local' ? 'local' : 'provider'
}

/**
 * What it takes for a change to be live. A Vercel variable needs a redeploy (inlined at build or
 * read per deployment, README, "Deploying"); a GitHub one applies at the next workflow run.
 */
export function afterChange(setting: FeatureSetting): 'redeploy' | 'next-run' | 'restart' | 'none' {
  switch (setting.where) {
    case 'vercel':
      return 'redeploy'
    case 'github':
      return 'next-run'
    case 'local':
      return 'restart'
    default:
      return 'none'
  }
}
