/**
 * Writes `.env.example` and the README's settings table from the feature registries:
 * `npm run config:docs [--check]`. `--check` writes nothing and exits 1 when either file is stale
 * (CI and the unit tests run it). Names and words only: a registry holds no value.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createJiti } from 'jiti'
import { format, resolveConfig } from 'prettier'

import { buildEnvExample, buildSettingsBlock, spliceBlock } from './config-docs-utils.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envFile = join(root, '.env.example')
const readmeFile = join(root, 'README.md')

const jiti = createJiti(import.meta.url, {
  alias: { '@': join(root, 'src') },
  interopDefault: true,
})

/** What the two files should hold now. `readme` is null when its markers are missing. */
export async function generate() {
  const { featureRegistry } = await jiti.import(join(root, 'src/app/feature-registry.ts'))
  const envText = buildEnvExample(featureRegistry)

  const current = readFileSync(readmeFile, 'utf8')
  const spliced = spliceBlock(current, buildSettingsBlock(featureRegistry))
  // README.md is Prettier-formatted, so the table is laid out the way `format:check` expects.
  const options = (await resolveConfig(readmeFile)) ?? {}
  const readmeText =
    spliced === null ? null : await format(spliced, { ...options, filepath: readmeFile })
  return { envText, readmeText, currentReadme: current }
}

async function main() {
  const check = process.argv.includes('--check')
  const { envText, readmeText, currentReadme } = await generate()
  if (readmeText === null) {
    console.error(
      'README.md has no <!-- config:settings:start --> and <!-- config:settings:end --> markers to write the table between.',
    )
    process.exit(1)
  }

  const staleEnv = !existsSync(envFile) || readFileSync(envFile, 'utf8') !== envText
  const staleReadme = readmeText !== currentReadme

  if (check) {
    const stale = [staleEnv && '.env.example', staleReadme && 'README.md'].filter(Boolean)
    if (stale.length > 0) {
      console.error(
        `${stale.join(' and ')} ${stale.length > 1 ? 'are' : 'is'} stale. Run \`npm run config:docs\` and commit the result.`,
      )
      process.exit(1)
    }
    console.log('.env.example and the README settings table are current.')
    return
  }

  if (staleEnv) writeFileSync(envFile, envText)
  if (staleReadme) writeFileSync(readmeFile, readmeText)
  console.log(
    `Wrote ${[staleEnv && '.env.example', staleReadme && 'the README settings table'].filter(Boolean).join(' and ') || 'nothing (already current)'}.`,
  )
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main()
