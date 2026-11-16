// Server process. Default Node HTTP timeout handling is kept: no 'timeout' listener on the server, request or response
// (socketOnTimeout only destroys when none exists). Observers are socket-level listeners only. Records go to a file with
// fs.writeSync, so a record is written when its callback runs.
import fs from 'node:fs'
import http from 'node:http'

const [outPath, policy] = process.argv.slice(2)
// default: the settings the fake lake runs with today. candidate: the fake-lake patch (keepAliveTimeout 0), nothing else.
const OPTIONS = { default: { keepAliveTimeout: 5000, keepAliveTimeoutBuffer: 1000 }, candidate: { keepAliveTimeout: 0 } }[policy]
if (!OPTIONS) throw new Error(`unknown policy ${policy}`)
const out = fs.openSync(outPath, 'a')
const now = () => Math.round((performance.timeOrigin + performance.now()) * 10) / 10
const log = (event, data = {}) =>
  fs.writeSync(out, JSON.stringify({ side: 'server', at: now(), event, ...data }) + '\n')

const ids = new WeakMap()
const perSocketRequests = new Map()
let nextId = 1

const server = http.createServer(OPTIONS, async (req, res) => {
  const socket = req.socket
  const conn = ids.get(socket)
  const ordinal = (perSocketRequests.get(conn) ?? 0) + 1
  perSocketRequests.set(conn, ordinal)
  log('request-parsed', { conn, ordinal, method: req.method, url: req.url, remotePort: socket.remotePort })
  if (req.method === 'POST') {
    let bodyBytes = 0
    for await (const chunk of req) bodyBytes += chunk.length
    log('request-body-read', { conn, ordinal, bodyBytes })
  }
  const match = /^\/block\?ms=(\d+)$/.exec(req.url)
  if (match) {
    const ms = Number(match[1])
    log('block-start', { conn, ms })
    const end = performance.now() + ms
    while (performance.now() < end);
    log('block-end', { conn, ms })
  }
  res.on('finish', () => {
    log('response-finish', { conn, ordinal, url: req.url })
    // Node arms the keep-alive timeout in its own 'finish' listener, registered before this one.
    setImmediate(() => log('socket-timeout-armed', { conn, ordinal, timeoutMs: socket.timeout ?? null }))
  })
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify({ method: req.method, url: req.url, conn, ordinal }))
})

server.on('connection', (socket) => {
  const conn = nextId++
  ids.set(socket, conn)
  log('connection-open', { conn, remotePort: socket.remotePort })
  // Before and after Node's own socketOnTimeout (registered by the server's connection listener, ahead of this one).
  socket.prependListener('timeout', () =>
    log('socket-timeout-before-default', { conn, destroyed: socket.destroyed, timeoutMs: socket.timeout ?? null }),
  )
  socket.on('timeout', () => log('socket-timeout-after-default', { conn, destroyed: socket.destroyed }))
  socket.on('end', () => log('socket-end-received', { conn }))
  socket.on('error', (error) => log('socket-error', { conn, code: error.code }))
  socket.on('close', (hadError) =>
    log('socket-close', {
      conn,
      hadError,
      requestsParsed: perSocketRequests.get(conn) ?? 0,
      bytesRead: socket.bytesRead,
      bytesWritten: socket.bytesWritten,
    }),
  )
})

server.listen(0, '127.0.0.1', () => {
  log('listening', {
    policy,
    port: server.address().port,
    keepAliveTimeout: server.keepAliveTimeout,
    keepAliveTimeoutBuffer: server.keepAliveTimeoutBuffer,
    headersTimeout: server.headersTimeout,
    requestTimeout: server.requestTimeout,
    timeout: server.timeout,
    node: process.version,
    undici: process.versions.undici,
    uv: process.versions.uv,
    pid: process.pid,
  })
  fs.writeSync(1, `READY ${server.address().port}\n`)
})
