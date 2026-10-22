/** Isolated copies keep the test servers from sharing Next.js runtime files, on every OS. */
import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve, sep } from 'node:path'

const names = { 'enquiries-off': 'e2e-enquiries-off', prelaunch: 'e2e-prelaunch' }
const name = names[process.argv[2]]
if (!name) throw new Error('Choose enquiries-off or prelaunch.')
const cache = resolve('node_modules/.cache')
const destination = resolve(cache, name)
if (!destination.startsWith(`${cache}${sep}`)) throw new Error('Build copy must stay in the cache.')
rmSync(destination, { recursive: true, force: true })
mkdirSync(dirname(destination), { recursive: true })
cpSync(resolve('.next'), destination, { recursive: true })
