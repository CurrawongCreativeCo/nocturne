// Server process. Default Node HTTP timeout handling is kept: no 'timeout' listener on the server, request or response
// (socketOnTimeout only destroys when none exists). Observers are socket-level listeners only. Records go to a file with
// fs.writeSync, so a record is written when its callback runs.
import fs from 'node:fs'
import http from 'node:http'

const [outPath] = process.argv.slice(2)
const out = fs.openSync(outPath, 'a')
const now = () => Math.round((performance.timeOrigin + performance.now()) * 10) / 10
const log = (event, data = {}) =>
  fs.writeSync(out, JSON.stringify({ side: 'server', at: now(), event, ...data }) + '\n')

const ids = new WeakMap()
const perSocketRequests = new Map()
let nextId = 1

const server = http.createServer({ keepAliveTimeout: 5000, keepAliveTimeoutBuffer: 1000 }, (req, res) => {
  const socket = req.socket
  const conn = ids.get(socket)
  const ordinal = (perSocketRequests.get(conn) ?? 0) + 1
  perSocketRequests.set(conn, ordinal)
  log('request-parsed', { conn, ordinal, url: req.url, remotePort: socket.remotePort })
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
  res.end(JSON.stringify({ url: req.url, conn, ordinal }))
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
    port: server.address().port,
    keepAliveTimeout: server.keepAliveTimeout,
    keepAliveTimeoutBuffer: server.keepAliveTimeoutBuffer,
    node: process.version,
    undici: process.versions.undici,
    uv: process.versions.uv,
    pid: process.pid,
  })
  fs.writeSync(1, `READY ${server.address().port}\n`)
})
