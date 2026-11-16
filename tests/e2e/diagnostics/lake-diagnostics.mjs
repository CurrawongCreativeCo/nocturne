import { execFile } from 'node:child_process'
import { freemem, loadavg, totalmem, cpus } from 'node:os'

import { clip, emit, requestKey } from './diagnostics-log.mjs'

/**
 * Opt-in diagnostics for the fake Content Lake (task 151 CI investigation): E2E_LAKE_DIAGNOSTICS=1.
 *
 * What it records, so a connection reset seen by the site's build can be matched to what the lake saw:
 * - the settings the server really runs with (keepAliveTimeout, keepAliveTimeoutBuffer where Node has one,
 *   headersTimeout, requestTimeout, server.timeout, maxRequestsPerSocket), once, after it listens;
 * - each connection: an id, both ports, when it opened, how many requests it served, how long it idled between
 *   the last response and the next request, and how it closed (hadError, bytes, lifetime);
 * - each request: connection id, its sequence on that connection, method, a clipped path, and whether the response
 *   finished or the connection closed first;
 * - at low frequency, the runner's load average, memory and the processes that look like the site's build.
 *
 * What it never does: change a header, a status, a body, a timeout or a pooling setting; consume a request or response
 * stream; or replace Node's own handling. It only adds listeners to events where Node has no default behaviour
 * (`connection`, `request` beside the server's own handler and ahead of it, `close`, `finish`). It deliberately adds no `clientError`
 * listener (that would replace Node's default of answering 400 and closing) and no `error` listener of its own (the
 * lake already has one). Every handler is guarded, and the log is bounded (see diagnostics-log.cjs).
 *
 * It records what happened. It does not say why: a stall in the log is not evidence of a cause.
 */

const SAMPLE_MS = Math.max(1000, Number(process.env.E2E_DIAGNOSTICS_SAMPLE_MS) || 5000)
const MAX_SAMPLES = Math.max(1, Number(process.env.E2E_DIAGNOSTICS_MAX_SAMPLES) || 240)
const PS_LINES = 12
const WORKER_PATTERN = /next|node |playwright|jest-worker|processChild/

/** The server's own timeouts, as Node holds them (a setting Node does not have is null, not a guess). */
export const serverSettings = (server) => ({
  keepAliveTimeout: server.keepAliveTimeout ?? null,
  keepAliveTimeoutBuffer: server.keepAliveTimeoutBuffer ?? null,
  headersTimeout: server.headersTimeout ?? null,
  requestTimeout: server.requestTimeout ?? null,
  timeout: server.timeout ?? null,
  maxRequestsPerSocket: server.maxRequestsPerSocket ?? null,
  maxHeadersCount: server.maxHeadersCount ?? null,
  connectionsCheckingInterval: server.connectionsCheckingInterval ?? null,
})

/** The processes that look like the site's build or tests, by CPU: a snapshot, read without touching them. */
function sampleProcesses() {
  return new Promise((resolve) => {
    execFile(
      'ps',
      ['-axo', 'pid=,ppid=,pcpu=,rss=,etime=,args='],
      { timeout: 2000, maxBuffer: 1024 * 1024 },
      (error, stdout) => {
        if (error) return resolve({ error: clip(error.code ?? error.message, 40) })
        const rows = String(stdout)
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line && WORKER_PATTERN.test(line) && !/ps -axo/.test(line))
          .map((line) => {
            const [pid, ppid, pcpu, rss, etime, ...args] = line.split(/\s+/)
            return {
              pid: Number(pid),
              ppid: Number(ppid),
              pcpu: Number(pcpu),
              rssKb: Number(rss),
              etime,
              args: clip(args.join(' '), 90),
            }
          })
          .sort((a, b) => b.pcpu - a.pcpu)
        resolve({ total: rows.length, top: rows.slice(0, PS_LINES) })
      },
    )
  })
}

export function installLakeDiagnostics(server, { port } = {}) {
  let connectionIds = 0
  const open = new Set()

  server.on('connection', (socket) => {
    try {
      const id = ++connectionIds
      const state = {
        id,
        opened: Date.now(),
        requests: 0,
        lastResponseEnd: null,
      }
      socket.__diag = state
      open.add(id)
      emit('lake', 'connection-open', {
        connId: id,
        remotePort: socket.remotePort ?? null,
        remoteAddress: socket.remoteAddress ?? null,
        remoteFamily: socket.remoteFamily ?? null,
        localPort: socket.localPort ?? null,
        localAddress: socket.localAddress ?? null,
        localFamily: socket.localFamily ?? null,
        open: open.size,
      })
      socket.once('close', (hadError) => {
        try {
          open.delete(id)
          emit('lake', 'connection-close', {
            connId: id,
            hadError,
            requests: state.requests,
            lifetimeMs: Date.now() - state.opened,
            idleMsAtClose:
              state.lastResponseEnd === null ? null : Date.now() - state.lastResponseEnd,
            bytesRead: socket.bytesRead,
            bytesWritten: socket.bytesWritten,
            destroyed: socket.destroyed,
            open: open.size,
          })
        } catch {
          // Dropped on purpose.
        }
      })
    } catch {
      // Dropped on purpose.
    }
  })

  // Beside the server's own request handler, not instead of it: both run, and this one reads and answers nothing.
  // Prepended, so the request is observed before the handler does any work: the lake evaluates GROQ synchronously,
  // and a listener added after the handler would be recorded only once that work was over (a late timestamp, and an
  // idle time that includes the handler's own time).
  server.prependListener('request', (req, res) => {
    try {
      const state = req.socket?.__diag
      if (!state) return
      const seq = ++state.requests
      const idleMs = state.lastResponseEnd === null ? null : Date.now() - state.lastResponseEnd
      const started = Date.now()
      emit('lake', 'request', {
        connId: state.id,
        seq,
        method: req.method,
        path: clip(req.url, 120),
        // Of the whole URL, not of the clipped path above: the key the client records carry for the same request.
        urlKey: requestKey(req.method, req.url),
        idleMsBeforeRequest: idleMs,
        httpVersion: req.httpVersion,
        connectionHeader: clip(req.headers.connection, 40) || null,
      })
      res.once('finish', () => {
        try {
          state.lastResponseEnd = Date.now()
          emit('lake', 'response-finish', {
            connId: state.id,
            seq,
            status: res.statusCode,
            ms: Date.now() - started,
          })
        } catch {
          // Dropped on purpose.
        }
      })
      res.once('close', () => {
        try {
          if (!res.writableFinished)
            emit('lake', 'response-closed-early', {
              connId: state.id,
              seq,
              ms: Date.now() - started,
            })
        } catch {
          // Dropped on purpose.
        }
      })
    } catch {
      // Dropped on purpose.
    }
  })

  const announce = async () => {
    emit('lake', 'settings', {
      node: process.version,
      port,
      ppid: process.ppid,
      cpus: cpus().length,
      totalMemMb: Math.round(totalmem() / 1048576),
      ...serverSettings(server),
    })
  }
  server.once('listening', announce)

  // Low frequency, bounded, and unref'd so it never keeps the lake alive. Load and processes are context only.
  let samples = 0
  const timer = setInterval(() => {
    if (samples >= MAX_SAMPLES) return clearInterval(timer)
    samples += 1
    const n = samples
    sampleProcesses()
      .then((processes) => {
        emit('lake', 'sample', {
          n,
          loadavg: loadavg().map((v) => Math.round(v * 100) / 100),
          freeMemMb: Math.round(freemem() / 1048576),
          openConnections: open.size,
          processes,
        })
      })
      .catch(() => {
        // Dropped on purpose.
      })
  }, SAMPLE_MS)
  timer.unref()
}
