import { spawn } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

import { appEnv, DATASET } from './safety.ts'

const env = appEnv()
const serve = process.argv.includes('--serve')
const stampPath = 'node_modules/.cache/studio-perf/studio-perf-target.json'
const target = { project: env.NEXT_PUBLIC_SANITY_PROJECT_ID, dataset: DATASET }
if (serve) {
  if (!existsSync(stampPath)) throw new Error('Run npm run studio-perf:build before serving.')
  const stamp: unknown = JSON.parse(readFileSync(stampPath, 'utf8'))
  if (JSON.stringify(stamp) !== JSON.stringify(target))
    throw new Error('The performance build targets a different project. Rebuild before serving.')
}
const child = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', ...(serve ? ['start', '-p', '3200'] : ['build'])],
  { env, stdio: 'inherit' },
)
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => child.kill(signal))
child.on('exit', (code) => {
  if (!serve && code === 0) writeFileSync(stampPath, JSON.stringify(target))
  process.exitCode = code ?? 1
})
