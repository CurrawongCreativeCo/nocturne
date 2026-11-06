/**
 * Writes the generated half of the README's "Design capability contract" from the declarations and the
 * evidence: `npm run design-capability-docs [--check]`. `npm run typegen` runs it after the design
 * manifest, and CI fails when the committed README differs; `--check` writes nothing and exits 1 when
 * the block is stale. Names and words only.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createJiti } from 'jiti'
import { format, resolveConfig } from 'prettier'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const readmeFile = join(root, 'README.md')

// The schemas import the site's config, which insists on a project; this check never talks to one.
process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||= 'design-contract-check'
process.env.NEXT_PUBLIC_SANITY_DATASET ||= 'production'

const jiti = createJiti(import.meta.url, {
  alias: { '@': join(root, 'src') },
  interopDefault: true,
  jsx: { runtime: 'automatic' },
})

/** What the README should hold now. `readme` is null when its markers are missing. */
export async function generate() {
  const { DESIGN_COMPONENTS, gate } = await jiti.import(join(root, 'src/app/design-components.ts'))
  const { EVIDENCE } = await jiti.import(join(root, 'src/lib/design/capability-evidence.ts'))
  const { CAPABILITY_EXCEPTIONS } = await jiti.import(
    join(root, 'src/lib/design/capability-exceptions.ts'),
  )
  const { capabilityDocs, spliceCapabilityDocs } = await jiti.import(
    join(root, 'src/lib/design/capability-docs.ts'),
  )
  const current = readFileSync(readmeFile, 'utf8')
  const spliced = spliceCapabilityDocs(
    current,
    capabilityDocs({
      components: DESIGN_COMPONENTS,
      evidence: EVIDENCE,
      gate,
      exceptions: CAPABILITY_EXCEPTIONS,
    }),
  )
  // README.md is Prettier-formatted, so the tables are laid out the way `format:check` expects.
  const options = (await resolveConfig(readmeFile)) ?? {}
  const readme =
    spliced === null ? null : await format(spliced, { ...options, filepath: readmeFile })
  return { readme, current }
}

async function main() {
  const check = process.argv.includes('--check')
  const { readme, current } = await generate()
  if (readme === null) {
    console.error(
      'README.md has no <!-- design-capabilities:start --> and <!-- design-capabilities:end --> markers to write the tables between.',
    )
    process.exit(1)
  }
  if (check) {
    if (readme !== current) {
      console.error(
        'The README’s Design capability contract tables are stale. Run `npm run design-capability-docs` (or `npm run typegen`) and commit README.md.',
      )
      process.exit(1)
    }
    console.log('The README’s Design capability contract tables are current.')
    return
  }
  if (readme !== current) writeFileSync(readmeFile, readme)
  console.log(
    readme === current
      ? 'The README’s Design capability contract tables are already current.'
      : 'Wrote the README’s Design capability contract tables.',
  )
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main()
