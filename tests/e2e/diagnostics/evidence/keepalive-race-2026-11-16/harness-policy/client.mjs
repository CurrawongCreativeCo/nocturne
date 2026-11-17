// Client process. Target traffic uses the global fetch (Node's bundled undici, default dispatcher). The blocker uses
// node:http with agent:false, so it is always a separate connection. Observation is through undici's diagnostics
// channels and socket listeners; the client never resets or destroys a socket itself.
import dc from 'node:diagnostics_channel'
import fs from 'node:fs'
import http from 'node:http'

const [port, scenario, outPath, method] = process.argv.slice(2)
const BLOCK_MS = 6000 // the unchanged long-block schedule, every case
const POST_BODY = JSON.stringify({ query: '*[_type == "post"][0]{_id}', pad: 'x'.repeat(1024) })
const BLOCKER_AT = 1000 // ms after the warm response completed (client clock)
const REUSE_AT = 2000 // ms after the warm response completed; undici's idle limit here is 3000
const out = fs.openSync(outPath, 'a')
const now = () => Math.round((performance.timeOrigin + performance.now()) * 10) / 10
const log = (event, data = {}) =>
  fs.writeSync(out, JSON.stringify({ side: 'client', at: now(), event, ...data }) + '\n')

const sockets = new WeakMap()
let nextSocket = 1
const sockId = (socket) => {
  if (!sockets.has(socket)) {
    const id = nextSocket++
    sockets.set(socket, id)
    const localPort = socket.localPort
    socket.on('close', (hadError) =>
      log('socket-close', { socket: id, localPort, hadError, bytesRead: socket.bytesRead, bytesWritten: socket.bytesWritten }),
    )
  }
  return sockets.get(socket)
}
const reqs = new WeakMap()
let nextReq = 1
const reqId = (request) => {
  if (!reqs.has(request)) reqs.set(request, { id: nextReq++, path: request.path })
  return reqs.get(request)
}
const lastComplete = new Map() // socket id -> time of last response completion
const reqSocket = new WeakMap()

dc.subscribe('undici:request:create', ({ request }) => log('request-create', reqId(request)))
dc.subscribe('undici:client:connected', ({ socket }) => log('socket-connected', { socket: sockId(socket), localPort: socket.localPort }))
dc.subscribe('undici:client:sendHeaders', ({ request, socket }) => {
  const s = sockId(socket)
  reqSocket.set(request, s)
  const last = lastComplete.get(s)
  log('send-headers', { ...reqId(request), socket: s, localPort: socket.localPort, msSinceSocketLastComplete: last == null ? null : Math.round((now() - last) * 10) / 10 })
})
dc.subscribe('undici:request:headers', ({ request, response }) => {
  const h = response.headers.map(String)
  const get = (name) => {
    const i = h.findIndex((v, n) => n % 2 === 0 && v.toLowerCase() === name)
    return i >= 0 ? h[i + 1] : null
  }
  log('response-headers', { ...reqId(request), status: response.statusCode, connection: get('connection'), keepAlive: get('keep-alive') })
})
dc.subscribe('undici:request:trailers', ({ request }) => {
  const s = reqSocket.get(request)
  lastComplete.set(s, now())
  log('response-complete', { ...reqId(request), socket: s })
})
dc.subscribe('undici:request:error', ({ request, error }) =>
  log('request-error', { ...reqId(request), socket: reqSocket.get(request) ?? null, name: error.name, code: error.code ?? null, message: error.message }),
)

const base = `http://127.0.0.1:${port}`
const at = (t) => new Promise((r) => setTimeout(r, Math.max(0, t - now())))

log('start', { scenario, method, blockMs: BLOCK_MS, blockerAt: BLOCKER_AT, reuseAt: REUSE_AT, pid: process.pid, node: process.version, undici: process.versions.undici })
const warm = await fetch(`${base}/warm`)
await warm.text()
const t0 = now()
log('warm-body-read', {})

const blocker = (async () => {
  await at(t0 + BLOCKER_AT)
  log('blocker-send', { ms: BLOCK_MS })
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: `/block?ms=${BLOCK_MS}`, agent: false }, (res) => {
      res.resume()
      res.on('end', () => {
        log('blocker-response-end', { localPort: req.socket?.localPort ?? null })
        resolve()
      })
    })
    req.on('socket', (s) => s.on('connect', () => log('blocker-connected', { localPort: s.localPort })))
    req.on('error', (e) => {
      log('blocker-error', { code: e.code })
      resolve()
    })
  })
})()

const reuse = (async () => {
  await at(t0 + REUSE_AT)
  log('reuse-fetch-call', { method, bodyBytes: method === 'POST' ? Buffer.byteLength(POST_BODY) : 0 })
  try {
    const r = await fetch(
      `${base}/reuse`,
      method === 'POST' ? { method, headers: { 'content-type': 'application/json' }, body: POST_BODY } : {},
    )
    const body = await r.text()
    log('reuse-outcome', { ok: true, status: r.status, body })
  } catch (error) {
    log('reuse-outcome', { ok: false, name: error.name, message: error.message, causeCode: error.cause?.code ?? null, causeErrno: error.cause?.errno ?? null, causeSyscall: error.cause?.syscall ?? null, causeMessage: error.cause?.message ?? null })
  }
})()

await Promise.all([blocker, reuse])
await new Promise((r) => setTimeout(r, 300))
log('done', {})
process.exit(0)
