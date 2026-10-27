import type { FeatureReport, FeatureStatus, SetupReport } from './evaluate'

const ICON: Record<FeatureStatus, string> = {
  ready: '✓',
  'not-set-up': '✗',
  off: '–',
  'cant-check': '?',
  'not-in-use': '·',
  dormant: '·',
}

/** The plain-English table `config:check` prints. Names and words only, never a value. */
export function formatTable(report: SetupReport): string {
  const width = Math.max(...report.features.map((feature) => feature.title.length)) + 2
  const lines = [`Configuration (${report.environment.label})`, '']

  for (const feature of report.features) {
    lines.push(`${ICON[feature.status]} ${feature.title.padEnd(width)}${feature.reason}`)
    const indent = ' '.repeat(width + 2)
    if (feature.status === 'not-set-up') lines.push(`${indent}Without it: ${feature.withoutIt}`)
    for (const item of feature.invalid) lines.push(`${indent}Fix: ${item.suggestion}`)
    for (const item of feature.planned) {
      lines.push(
        `${indent}Note: ${item.name} is registered but not implemented yet (${item.task}).`,
      )
    }
    for (const warning of feature.warnings) lines.push(`${indent}Note: ${warning}`)
    if (feature.live) lines.push(`${indent}Live check: ${liveLine(feature)}`)
  }

  if (report.pending.length > 0) {
    lines.push('', `Not registered yet: ${report.pending.join(', ')}.`)
  }
  return lines.join('\n')
}

function liveLine({ live }: FeatureReport) {
  if (!live) return ''
  if (live.status === 'not-implemented') return 'not implemented yet'
  return `${live.status === 'ok' ? '✓' : '✗'} ${live.message}`
}
