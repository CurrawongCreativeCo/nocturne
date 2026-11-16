import { createHash } from 'node:crypto'
import dc from 'node:diagnostics_channel'
import path from 'node:path'
import { isMainThread, threadId } from 'node:worker_threads'

import { clip, emit } from './diagnostics-log.mjs'

/**
 * Opt-in diagnostics for the site's HTTP requests to the fake Content Lake (task 151 CI investigation), loaded with
 * `node --import` through NODE_OPTIONS by playwright.config.ts when E2E_DIAGNOSTICS is set, so it runs in the build,
 * its workers and the server, and in nothing else. Without E2E_HTTP_DIAGNOSTICS=1 it does nothing at all.
 *
 * The transport it watches is the real one: next-sanity 13's bundled @sanity/client 7.27 calls get-it 8.8's Node
 * adapter, which uses `node:http` through a keep-alive `http.Agent` (keepAlive, 30 sockets), and retries a failed GET
 * itself. So this watches `node:http`'s own diagnostics channels, which publish without any change to a request:
 * - `http.client.request.created` a request exists, before it has a socket (the Agent's free/busy counts are read
 *                                 here, and a `socket` listener is added; Node publishes `start` after `socket`);
 * - `http.client.request.start`   its headers are about to be written;
 * - `http.client.request.error`   a request failed (the error is reported here; the request's own handling is
 *                                 untouched, and no `error` listener is added, so an unhandled one still throws);
 * - `http.client.response.finish` a response arrived;
 * - `net.client.socket`           a socket was created.
 * and, once, a `socket` and a `close` listener on the request's socket (events with no default behaviour).
 *
 * It records per-request: process, thread, a per-process request sequence, an ordinal for requests to the same URL
 * (`sameUrlOrdinal`, a count of HTTP attempts in this process; NOT get-it's `attemptNumber`, which lives above this
 * layer and is kept raw in the error Next prints), the socket's id, whether Node reused it, its age and how long it
 * idled since its last response, and how the request and the socket ended.
 *
 * It never changes a request, a response, a timeout, a retry or the pool, and never reads or consumes a body.
 */

if (process.env.E2E_HTTP_DIAGNOSTICS === '1') {
  try {
    install()
  } catch {
    // A diagnostic that cannot start does nothing.
  }
}

function install() {
  const ports = new Set(
    String(process.env.E2E_DIAGNOSTICS_PORTS || process.env.FAKE_SANITY_PORT || '9999')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean),
  )
  const where = { thread: isMainThread ? 'main' : `worker-${threadId}` }
  const hostPort = (request) => String(request.getHeader?.('host') ?? '')
  const watching = (request) => {
    const port = hostPort(request).split(':')[1] ?? '80'
    return ports.has(port)
  }

  let requestSeq = 0
  let socketSeq = 0
  const sockets = new WeakMap()
  const requests = new WeakMap()
  const urlCounts = new Map()
  const URL_COUNT_CAP = 500

  const socketInfo = (socket) => {
    let info = sockets.get(socket)
    if (!info) {
      info = {
        id: ++socketSeq,
        created: Date.now(),
        requests: 0,
        lastResponseEnd: null,
        closed: false,
      }
      sockets.set(socket, info)
      // The ports are known once it connects (a new socket is still connecting when a request is given it).
      socket.once('connect', () => {
        try {
          emit('client', 'socket-connected', {
            ...where,
            socketId: info.id,
            localPort: socket.localPort ?? null,
            remotePort: socket.remotePort ?? null,
            connectMs: Date.now() - info.created,
          })
        } catch {
          // Dropped on purpose.
        }
      })
      socket.once('close', (hadError) => {
        try {
          info.closed = true
          emit('client', 'socket-close', {
            ...where,
            socketId: info.id,
            hadError,
            requests: info.requests,
            ageMs: Date.now() - info.created,
            idleMsAtClose: info.lastResponseEnd === null ? null : Date.now() - info.lastResponseEnd,
            bytesRead: socket.bytesRead,
            bytesWritten: socket.bytesWritten,
          })
        } catch {
          // Dropped on purpose.
        }
      })
    }
    return info
  }

  const counts = (agent) => {
    try {
      const size = (group) =>
        Object.values(group ?? {}).reduce((total, list) => total + list.length, 0)
      return {
        free: size(agent?.freeSockets),
        busy: size(agent?.sockets),
        queued: size(agent?.requests),
      }
    } catch {
      return null
    }
  }

  emit('client', 'preload', {
    ...where,
    node: process.version,
    ppid: process.ppid,
    script: path.basename(String(process.argv[1] ?? '')),
    phase: process.env.NEXT_PHASE ?? null,
    ports: [...ports],
  })

  dc.subscribe('net.client.socket', (message) => {
    try {
      const socket = message?.socket
      if (!socket) return
      // Created, not yet connected: its id is how a later request is tied to it.
      const info = socketInfo(socket)
      emit('client', 'socket-created', { ...where, socketId: info.id })
    } catch {
      // Dropped on purpose.
    }
  })

  /** The request's record, made on first sight: `created` where Node publishes it, else `start`. */
  const ensure = (request) => {
    let state = requests.get(request)
    if (state) return state
    const url = String(request.path ?? '')
    const key = createHash('sha1').update(`${request.method} ${url}`).digest('hex').slice(0, 8)
    const ordinal = (urlCounts.get(key) ?? 0) + 1
    if (urlCounts.size < URL_COUNT_CAP || urlCounts.has(key)) urlCounts.set(key, ordinal)
    state = {
      seq: ++requestSeq,
      started: Date.now(),
      key,
      ordinal,
      socketId: null,
      reused: null,
      idleMs: null,
      bound: false,
    }
    requests.set(request, state)
    emit('client', 'request-created', {
      ...where,
      reqSeq: state.seq,
      method: request.method,
      host: hostPort(request),
      path: clip(url, 100),
      urlKey: key,
      sameUrlOrdinal: ordinal,
      // Once the Agent has chosen a socket for it (Node does that in the constructor): how many it holds idle, in
      // use (this request's included) and waiting. It is not a snapshot from before the choice.
      agent: counts(request.agent),
    })
    // Node emits `socket` before it publishes `start`, so this is registered at `created`; `socket` has no default
    // behaviour, so a listener of ours changes nothing for the request.
    request.once('socket', (socket) => bind(request, state, socket))
    return state
  }

  const bind = (request, state, socket) => {
    try {
      if (state.bound) return
      state.bound = true
      const info = socketInfo(socket)
      info.requests += 1
      state.socketId = info.id
      state.reused = Boolean(request.reusedSocket)
      state.idleMs = info.lastResponseEnd === null ? null : Date.now() - info.lastResponseEnd
      emit('client', 'request-socket', {
        ...where,
        reqSeq: state.seq,
        socketId: info.id,
        reusedSocket: state.reused,
        socketAgeMs: Date.now() - info.created,
        socketRequests: info.requests,
        idleMsSinceLastResponse: state.idleMs,
        localPort: socket.localPort ?? null,
        remotePort: socket.remotePort ?? null,
        socketDestroyed: socket.destroyed,
      })
    } catch {
      // Dropped on purpose.
    }
  }

  dc.subscribe('http.client.request.created', (message) => {
    try {
      const request = message?.request
      if (request && watching(request)) ensure(request)
    } catch {
      // Dropped on purpose.
    }
  })

  dc.subscribe('http.client.request.start', (message) => {
    try {
      const request = message?.request
      if (!request || !watching(request)) return
      const state = ensure(request)
      if (!state.bound && request.socket) bind(request, state, request.socket)
      emit('client', 'request-start', {
        ...where,
        reqSeq: state.seq,
        method: request.method,
        sameUrlOrdinal: state.ordinal,
        msSinceCreated: Date.now() - state.started,
      })
    } catch {
      // Dropped on purpose.
    }
  })

  dc.subscribe('http.client.response.finish', (message) => {
    try {
      const request = message?.request
      const state = request && requests.get(request)
      if (!state) return
      const socket = request.socket
      if (socket) {
        const info = sockets.get(socket)
        if (info) info.lastResponseEnd = Date.now()
      }
      emit('client', 'response', {
        ...where,
        reqSeq: state.seq,
        socketId: state.socketId,
        status: message.response?.statusCode ?? null,
        ms: Date.now() - state.started,
        keepAliveHint: clip(message.response?.headers?.['keep-alive'], 40) || null,
      })
    } catch {
      // Dropped on purpose.
    }
  })

  dc.subscribe('http.client.request.error', (message) => {
    try {
      const request = message?.request
      const state = request && requests.get(request)
      if (!state) return
      const error = message.error ?? {}
      const socket = request.socket
      const info = socket ? sockets.get(socket) : undefined
      emit('client', 'request-error', {
        ...where,
        reqSeq: state.seq,
        urlKey: state.key,
        sameUrlOrdinal: state.ordinal,
        code: error.code ?? null,
        errno: error.errno ?? null,
        syscall: error.syscall ?? null,
        message: clip(error.message, 80),
        msSinceStart: Date.now() - state.started,
        socketId: state.socketId,
        reusedSocket: state.reused,
        socketAgeMs: info ? Date.now() - info.created : null,
        idleMsBeforeUse: state.idleMs,
        agent: counts(request.agent),
      })
    } catch {
      // Dropped on purpose.
    }
  })
}
