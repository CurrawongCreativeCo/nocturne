// Runs the two fixed scenarios once each, in order, each with a fresh server and client process. A 25 s watchdog kills
// every child and exits 124. No retries, no tuning.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const [node, outDir] = process.argv.slice(2)
const here = path.dirname(new URL(import.meta.url).pathname)
const children = new Set()
const env = { ...process.env }
delete env.NODE_OPTIONS
const killAll = () => {
  for (const c of children) if (c.exitCode === null && c.signalCode === null) c.kill('SIGKILL')
}
process.on('exit', killAll)
const watchdog = setTimeout(() => {
  fs.writeSync(2, 'WATCHDOG: 35 s elapsed, killing children\n')
  killAll()
  process.exit(124)
}, 35_000)
const CASES = [
  { name: 'default-get', policy: 'default', method: 'GET' },
  { name: 'candidate-get', policy: 'candidate', method: 'GET' },
  { name: 'candidate-post', policy: 'candidate', method: 'POST' },
]

const start = (args) => {
  const c = spawn(node, args, { env, stdio: ['ignore', 'pipe', 'pipe'] })
  children.add(c)
  c.stderr.on('data', (d) => fs.writeSync(2, `[${path.basename(args[0])} stderr] ${d}`))
  return c
}
const exited = (c) => new Promise((r) => (c.exitCode !== null || c.signalCode !== null ? r() : c.once('exit', r)))

fs.mkdirSync(outDir, { recursive: true })
for (const { name: scenario, policy, method } of CASES) {
  const file = path.join(outDir, `${scenario}.jsonl`)
  fs.writeFileSync(file, '')
  const server = start([path.join(here, 'server.mjs'), file, policy])
  const port = await new Promise((resolve, reject) => {
    let buf = ''
    server.stdout.on('data', (d) => {
      buf += d
      const m = /READY (\d+)/.exec(buf)
      if (m) resolve(m[1])
    })
    server.once('exit', () => reject(new Error('server exited before READY')))
  })
  const client = start([path.join(here, 'client.mjs'), port, scenario, file, method])
  await exited(client)
  await new Promise((r) => setTimeout(r, 200))
  server.kill('SIGTERM')
  await exited(server)
  fs.writeSync(1, `${scenario}: client exit ${client.exitCode}, server ${server.signalCode ?? server.exitCode}\n`)
}
clearTimeout(watchdog)
