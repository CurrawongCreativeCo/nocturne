/**
 * Says which features are set up: `npm run config:check [--strict] [--build] [--live] [--json]`.
 * Prints a plain-English table (Ready / Not set up / Off in profile / Can't check here), reading the
 * environment first and `.env.local` second, like `check:dataset`. Names and words only: no value is
 * ever printed. The registry and the checks are TypeScript (src/app/feature-registry.ts,
 * src/lib/config/), loaded with jiti like the editor guide.
 *
 *   --strict     exit 1 when a feature that is on is missing something it needs
 *   --build      only the core gate (README, "Configuration"); `npm run build` runs it first
 *   --live       also asks Sanity about the dataset (the other features: "not implemented yet")
 *   --json       the same report as JSON, for tools
 *   --no-env-file  ignore .env.local (the tests use it)
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createJiti } from 'jiti'

import { checkDataset, parseEnv } from './check-dataset.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const jiti = createJiti(import.meta.url, {
  alias: { '@': join(root, 'src') },
  interopDefault: true,
})

/** The environment, then `.env.local` for what the environment lacks. */
export function loadEnv(rootDir, { envFile = true, base = process.env } = {}) {
  const path = join(rootDir, '.env.local')
  const file = envFile && existsSync(path) ? parseEnv(readFileSync(path, 'utf8')) : {}
  const env = { ...file }
  for (const [key, value] of Object.entries(base)) if (value) env[key] = value
  return env
}

/** Adds a `live` result to each feature: Sanity core is checked, the rest aren't implemented yet. */
export async function addLiveChecks(report, env, { check = checkDataset } = {}) {
  for (const feature of report.features) {
    if (feature.status === 'off') continue
    if (feature.id !== 'sanity-core') {
      feature.live = { status: 'not-implemented', message: 'not implemented yet' }
      continue
    }
    const result = await check({
      projectId: env.NEXT_PUBLIC_SANITY_PROJECT_ID,
      dataset: env.NEXT_PUBLIC_SANITY_DATASET || 'production',
      token: env.SANITY_API_READ_TOKEN,
    })
    feature.live = { status: result.ok ? 'ok' : 'failed', message: result.message }
  }
  return report
}

async function main() {
  const args = new Set(process.argv.slice(2))
  const env = loadEnv(root, { envFile: !args.has('--no-env-file') })

  const { featureRegistry, pending, readinessFunctions } = await jiti.import(
    join(root, 'src/app/feature-registry.ts'),
  )
  const { siteProfile } = await jiti.import(join(root, 'src/config/profile.ts'))
  const { detectBuildEnvironment } = await jiti.import(join(root, 'src/lib/config/environment.ts'))
  const environment = detectBuildEnvironment(env)

  if (args.has('--build')) {
    const { evaluateGate, formatGate } = await jiti.import(join(root, 'src/lib/config/gate.ts'))
    const result = evaluateGate(featureRegistry, env, environment)
    const lines = formatGate(result)
    if (result.failures.length > 0) {
      console.error(lines.join('\n'))
      process.exit(1)
    }
    if (lines.length > 0) console.warn(lines.join('\n'))
    console.log(`✓ Core settings are present (${environment.label}).`)
    return
  }

  const { buildReport, hasRequiredGap } = await jiti.import(
    join(root, 'src/lib/config/evaluate.ts'),
  )
  const { formatTable } = await jiti.import(join(root, 'src/lib/config/format.ts'))
  const report = buildReport({
    registry: featureRegistry,
    env,
    environment,
    profileFeatures: siteProfile.features,
    readiness: readinessFunctions,
    pending,
  })
  if (args.has('--live')) await addLiveChecks(report, env)

  console.log(args.has('--json') ? JSON.stringify(report, null, 2) : formatTable(report))

  const liveFailed = report.features.some((feature) => feature.live?.status === 'failed')
  if ((args.has('--strict') && hasRequiredGap(report)) || liveFailed) process.exit(1)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main()
