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
 * - `http.client.response.finish` a response's HEADERS arrived (not its body: that is observed separately, below);
 * - `net.client.socket`           a socket was created (only its time is noted; see `createdAt`).
 * and, for a watched request only, `socket`, `connect`, `free` and `close` listeners on its socket and `end` and
 * `close` listeners on its response (events with no default behaviour; none reads, resumes or consumes anything).
 *
 * It records per-request: process, thread, a per-process request sequence, an ordinal for requests to the same URL
 * (`sameUrlOrdinal`, a count of HTTP attempts in this process; NOT get-it's `attemptNumber`, which lives above this
 * layer and is kept raw in the error Next prints), the socket's id, whether Node reused it, its age and how long it
 * idled since the Agent last took it back (`free`: a response completely read, not just begun), when the response's
 * headers arrived and when its body ended, and how the request and the socket ended. Events are scoped to watched
 * traffic: a socket no watched request uses is never logged and spends none of the log budget.
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

  /** When each socket was created, kept for every socket (a timestamp, nothing logged) until a watched request uses one. */
  const createdAt = new WeakMap()

  /**
   * A watched request's socket, on first sight: only now is it known to be watched traffic, so only now are its
   * creation, connection, release and close recorded. A socket no watched request ever uses costs nothing in the log.
   */
  const socketInfo = (socket) => {
    let info = sockets.get(socket)
    if (!info) {
      const created = createdAt.get(socket) ?? Date.now()
      info = { id: ++socketSeq, created, requests: 0, lastFree: null, closed: false }
      sockets.set(socket, info)
      emit('client', 'socket-created', {
        ...where,
        socketId: info.id,
        createdAgoMs: Date.now() - created,
      })
      const connected = () => {
        try {
          emit('client', 'socket-connected', {
            ...where,
            socketId: info.id,
            localPort: socket.localPort ?? null,
            remotePort: socket.remotePort ?? null,
            connectMs: Date.now() - created,
          })
        } catch {
          // Dropped on purpose.
        }
      }
      // The ports are known once it connects (a new socket is still connecting when a request is given it).
      if (socket.connecting) socket.once('connect', connected)
      else connected()
      // `free` is when the Agent takes the socket back, after a response has been completely read: that, not the
      // arrival of its headers, is when the socket starts to idle. A listener here reads nothing from the socket.
      socket.on('free', () => {
        info.lastFree = Date.now()
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
            idleMsAtClose: info.lastFree === null ? null : Date.now() - info.lastFree,
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

  // Every socket the process creates is announced here, including the many that have nothing to do with the lake, so
  // this only notes when it was made. Nothing is logged and no listener is added until a watched request uses it.
  dc.subscribe('net.client.socket', (message) => {
    try {
      if (message?.socket) createdAt.set(message.socket, Date.now())
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
      state.idleMs = info.lastFree === null ? null : Date.now() - info.lastFree
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

  // `http.client.response.finish` is the arrival of the response's HEADERS, not the end of its body, so it is recorded as
  // that (`response`). The body's end is observed on the response itself with `end` and `close` listeners, which do not
  // read, resume or consume it (only a `data` listener, `resume` or `read` would): `response-complete` is written
  // when the application has read the body to its end, or `response-closed` when the response closed without that.
  dc.subscribe('http.client.response.finish', (message) => {
    try {
      const request = message?.request
      const response = message?.response
      const state = request && requests.get(request)
      if (!state) return
      emit('client', 'response', {
        ...where,
        reqSeq: state.seq,
        socketId: state.socketId,
        status: response?.statusCode ?? null,
        ms: Date.now() - state.started,
        keepAliveHint: clip(response?.headers?.['keep-alive'], 40) || null,
      })
      if (!response) return
      let done = false
      const finish = (event) => () => {
        try {
          if (done) return
          done = true
          emit('client', event, {
            ...where,
            reqSeq: state.seq,
            socketId: state.socketId,
            ms: Date.now() - state.started,
            complete: Boolean(response.complete),
          })
        } catch {
          // Dropped on purpose.
        }
      }
      response.once('end', finish('response-complete'))
      response.once('close', finish('response-closed'))
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
