import dc from 'node:diagnostics_channel'

import { clip, emit, requestKey } from './diagnostics-log.mjs'

/**
 * Diagnostics for the site's `fetch` requests to the fake Content Lake (task 151 CI investigation), through undici's own
 * diagnostics channels. Installed by http-client-diagnostics.mjs, so it shares its gate (E2E_HTTP_DIAGNOSTICS=1), its
 * watched ports and its bounded, guarded log.
 *
 * Why undici: the site reads Sanity through next-sanity's `sanityFetch` (the `next-js` export of `next-sanity/live`),
 * whose nested @sanity/client 7.27 and get-it 8.8 resolve under Next's `react-server` condition to builds that call the
 * global `fetch`: Node's undici, with its own connection pool, not `node:http` and not an `http.Agent`. (A first logger
 * watched only `node:http` and saw none of this.) The channels used are undici's published ones:
 * - `undici:request:create`          a fetch becomes an undici request (method, origin, path);
 * - `undici:client:connected`        a connection was made (the socket, and so both endpoints);
 * - `undici:client:connectError`     a connection could not be made;
 * - `undici:client:sendHeaders`      the request is being written to a socket: the one place undici's channels tie a
 *                                    request to a socket, so only requests that got that far have one;
 * - `undici:request:headers`         the response's status and headers arrived;
 * - `undici:request:trailers`        undici has received the whole response (not necessarily that the application has
 *                                    read it);
 * - `undici:request:error`           the request failed.
 * and, for a socket a watched request was written to, a `close` listener (an event with no default behaviour).
 *
 * WHICH TRAFFIC. The filter is a PORT NUMBER and nothing else: a request or connection is watched when its port is one of
 * the watched ports (E2E_DIAGNOSTICS_PORTS, default the lake's), whatever host it names. It does not compare hosts,
 * origins or addresses; the origin is only recorded. Everything else writes nothing and spends none of the line budget.
 *
 * WHAT IS RECORDED, as facts: each endpoint of a socket by address, family and port; counts and times from this
 * process's own callbacks. WHAT IS NOT: headers (the authorization header never leaves undici's request), any body (none
 * is read or locked), and any claim undici's channels cannot support: they publish no "reused" flag and no pool state, so
 * `requestsOnSocket` is only a count of the watched requests written to that socket, and which side closed a connection
 * first is not something they can say. There is no connection-time metric: the one that was here read null
 * in every record, and a time keyed only by host and port could not tell connections apart.
 *
 * It changes no request, retry, timeout or pool, and adds no `error` listener to anything.
 */
export function installUndiciDiagnostics({ ports, where }) {
  const requests = new WeakMap()
  const sockets = new WeakMap()
  const urlCounts = new Map()
  const URL_COUNT_CAP = 500
  let requestSeq = 0
  let socketSeq = 0

  const portOf = (origin) => {
    try {
      const url = new URL(String(origin))
      return url.port || (url.protocol === 'https:' ? '443' : '80')
    } catch {
      return ''
    }
  }
  /** Both endpoints of a socket, as Node reports them: address, family and port. */
  const endpoints = (socket) => ({
    localAddress: socket.localAddress ?? null,
    localFamily: socket.localFamily ?? null,
    localPort: socket.localPort ?? null,
    remoteAddress: socket.remoteAddress ?? null,
    remoteFamily: socket.remoteFamily ?? null,
    remotePort: socket.remotePort ?? null,
  })
  const watchedRequest = (request) => ports.has(portOf(request?.origin))
  const watchedConnection = (params) => ports.has(String(params?.port ?? ''))

  const socketInfo = (socket) => {
    let info = sockets.get(socket)
    if (!info) {
      info = { id: ++socketSeq, created: Date.now(), requests: 0, lastResponseEnd: null }
      sockets.set(socket, info)
      socket.once('close', (hadError) => {
        try {
          emit('client', 'fetch-socket-close', {
            ...where,
            socketId: info.id,
            hadError,
            requests: info.requests,
            ageMs: Date.now() - info.created,
            msSinceLastResponseEnd:
              info.lastResponseEnd === null ? null : Date.now() - info.lastResponseEnd,
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

  dc.subscribe('undici:request:create', (message) => {
    try {
      const request = message?.request
      if (!request || !watchedRequest(request)) return
      const path = String(request.path ?? '')
      const key = requestKey(request.method, path)
      const ordinal = (urlCounts.get(key) ?? 0) + 1
      if (urlCounts.size < URL_COUNT_CAP || urlCounts.has(key)) urlCounts.set(key, ordinal)
      const state = { seq: ++requestSeq, started: Date.now(), key, ordinal, socketId: null }
      requests.set(request, state)
      emit('client', 'fetch-request', {
        ...where,
        reqSeq: state.seq,
        method: request.method,
        origin: String(request.origin ?? ''),
        path: clip(path, 100),
        urlKey: key,
        // A count of fetches of this URL in this process; get-it's `attemptNumber` is above this layer and is not seen.
        sameUrlOrdinal: ordinal,
      })
    } catch {
      // Dropped on purpose.
    }
  })

  dc.subscribe('undici:client:connected', (message) => {
    try {
      const params = message?.connectParams
      const socket = message?.socket
      if (!socket || !params || !watchedConnection(params)) return
      const info = socketInfo(socket)
      emit('client', 'fetch-socket-connected', {
        ...where,
        socketId: info.id,
        ...endpoints(socket),
      })
    } catch {
      // Dropped on purpose.
    }
  })

  dc.subscribe('undici:client:connectError', (message) => {
    try {
      const params = message?.connectParams
      if (!params || !watchedConnection(params)) return
      const error = message.error ?? {}
      emit('client', 'fetch-connect-error', {
        ...where,
        port: Number(params.port),
        code: error.code ?? null,
        errno: error.errno ?? null,
        syscall: error.syscall ?? null,
        message: clip(error.message, 80),
      })
    } catch {
      // Dropped on purpose.
    }
  })

  // The one channel that names both the request and the socket.
  dc.subscribe('undici:client:sendHeaders', (message) => {
    try {
      const request = message?.request
      const socket = message?.socket
      const state = request && requests.get(request)
      if (!state || !socket) return
      const info = socketInfo(socket)
      info.requests += 1
      state.socketId = info.id
      state.socket = socket
      emit('client', 'fetch-socket', {
        ...where,
        reqSeq: state.seq,
        socketId: info.id,
        requestsOnSocket: info.requests,
        socketAgeMs: Date.now() - info.created,
        msSinceSocketLastResponseEnd:
          info.lastResponseEnd === null ? null : Date.now() - info.lastResponseEnd,
        ...endpoints(socket),
      })
    } catch {
      // Dropped on purpose.
    }
  })

  dc.subscribe('undici:request:headers', (message) => {
    try {
      const state = message?.request && requests.get(message.request)
      if (!state) return
      emit('client', 'fetch-headers', {
        ...where,
        reqSeq: state.seq,
        socketId: state.socketId,
        status: message.response?.statusCode ?? null,
        ms: Date.now() - state.started,
      })
    } catch {
      // Dropped on purpose.
    }
  })

  // undici has received the whole response. That is the end of the response at undici's level; whether the application
  // has read it is not known here and is not asked.
  dc.subscribe('undici:request:trailers', (message) => {
    try {
      const request = message?.request
      const state = request && requests.get(request)
      if (!state) return
      emit('client', 'fetch-complete', {
        ...where,
        reqSeq: state.seq,
        socketId: state.socketId,
        ms: Date.now() - state.started,
      })
      if (state.socket) {
        const info = sockets.get(state.socket)
        if (info) info.lastResponseEnd = Date.now()
      }
    } catch {
      // Dropped on purpose.
    }
  })

  dc.subscribe('undici:request:error', (message) => {
    try {
      const request = message?.request
      const state = request && requests.get(request)
      if (!state) return
      const error = message.error ?? {}
      emit('client', 'fetch-error', {
        ...where,
        reqSeq: state.seq,
        urlKey: state.key,
        sameUrlOrdinal: state.ordinal,
        code: error.code ?? null,
        errno: error.errno ?? null,
        syscall: error.syscall ?? null,
        causeCode: error.cause?.code ?? null,
        message: clip(error.message, 80),
        msSinceStart: Date.now() - state.started,
        // Set only for a request that got as far as being written to a socket.
        socketId: state.socketId,
      })
    } catch {
      // Dropped on purpose.
    }
  })
}
