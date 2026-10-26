/**
 * What a daily health run can mean (docs/nocturne/NOCTURNE_SETTINGS_CONFIGURATION.md, §R.2). The names
 * are the `outcome` values `health-result.json` will carry (task 230, which writes them). This is
 * only the vocabulary and its one rule: a run that checked nothing is never a healthy site. A green
 * workflow run is not evidence; only these outcomes are.
 */
export const HEALTH_OUTCOMES = [
  'not-implemented',
  'disabled',
  'unconfigured',
  'skipped',
  'healthy',
  'warning',
  'failed',
] as const
export type HealthOutcome = (typeof HEALTH_OUTCOMES)[number]

interface HealthOutcomeInfo {
  label: string
  /** Checks actually ran against the live site. */
  checked: boolean
  /** Needs somebody's attention. */
  problem: boolean
}

export const HEALTH_OUTCOME_INFO: Record<HealthOutcome, HealthOutcomeInfo> = {
  'not-implemented': { label: 'Not yet implemented', checked: false, problem: false },
  disabled: { label: 'Intentionally disabled', checked: false, problem: false },
  unconfigured: { label: 'Enabled but not configured correctly', checked: false, problem: true },
  skipped: { label: 'Workflow skipped: nothing was checked', checked: false, problem: true },
  healthy: { label: 'Ran successfully', checked: true, problem: false },
  warning: { label: 'Ran, with warnings', checked: true, problem: true },
  failed: { label: 'Ran and failed', checked: true, problem: true },
}

/** Only a run that checked the site and found nothing wrong is healthy. */
export function isHealthy(outcome: HealthOutcome) {
  return outcome === 'healthy'
}
