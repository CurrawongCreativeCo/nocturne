# Diagnostics for the build's connection resets

Status: **diagnostics only, cause unresolved.** Nothing here mitigates anything. No timeout, retry, pooling, response or
failure behaviour of the lake or the site changes, and the diagnostics are off unless `E2E_DIAGNOSTICS=1` is set.

The failure being investigated is the one that stopped CI jobs while the site was being built for the end-to-end tests:

```
Error occurred prerendering page "/blog/news-update"
TypeError: fetch failed ... [cause]: Error: read ECONNRESET  (errno -104, syscall read)
Error: Process from config.webServer was not able to start. Exit code: 1
```

## 1. Preserved evidence

The logs are GitHub's own job logs, fetched with the direct job-log API
(`gh api --allow-escape-sequences repos/CurrawongCreativeCo/nocturne/actions/jobs/<id>/logs`, which serves each job's
own log, so a rerun's job has its own), then gzipped here without editing. The SHA-256 is of the uncompressed log.

| File                               | Commit                                                     | Run         | Attempt | Job ID       | Job              | Failed at                                   |
| ---------------------------------- | ---------------------------------------------------------- | ----------- | ------- | ------------ | ---------------- | ------------------------------------------- |
| `evidence/job-132958185393.log.gz` | `7c5845f92954b7b71657992839e33958b115c3c5` (PR #215 head)  | 43761853978 | 1       | 132958185393 | `e2e (5/10)`     | the app web server's build, before any test |
| `evidence/job-132980429213.log.gz` | `55d59c35f8576a4a68960401188522d0c6cd6f0c` (merge of #215) | 43768997931 | 1       | 132980429213 | `e2e (isolated)` | step "Header dropdowns", at the web server  |
| `evidence/job-132987480244.log.gz` | `55d59c35f8576a4a68960401188522d0c6cd6f0c` (merge of #215) | 43768997931 | 2       | 132987480244 | `e2e (isolated)` | step "Button styles", at the web server     |

SHA-256 of the uncompressed logs:

- `132958185393`: `e16afe82cc28e4985551af836a81f00fe5831775c0b1e2bc5286b4ee762bd67d`
- `132980429213`: `7f8647a02945a57971fecf35c24737acd2bddecf8892cde40f6a0893680d4ca9`
- `132987480244`: `94b17dec7e7120bffc4f60c26d01897defb8b15918f7c435bf05aa6ca4e5f196`

Added with the capture (all under `evidence/`; `MANIFEST.md` has the provenance and the SHA-256 of every file):

- `job-133031068347.log.gz`: run 43785167062, attempt 1, `e2e (isolated)`, commit `eb3fcbb59311d1da82a41257a32ebd3218f4baa4`
  (merge of #216), diagnostics off; failed at "Design settings", on page `/edge-layer-colours`, on a **POST**.
- `capture-43785202190/`: the manual capture (run 43785202190, attempt 1, commit `eb3fcbb…`): the whole Playwright log, the
  `[e2e-diag]` lines, `commit.txt`, `exit-status.txt`, `counts.txt`. It passed and recorded no `ECONNRESET`, **and its client
  logger recorded no request at all** (section 3).

Added with the corrected capture:

- `job-133093273990.log.gz`: run 43804889468, attempt 1, `e2e (isolated)`, commit `4f59a8d9efe5aa83da2103f4bf6cb93216c3b2c3`
  (merge of #217), diagnostics off; failed at "Section panels under each palette", with the signature of the first three.
- `capture-43804915434/`: the corrected capture (run 43804915434, attempt 1, commit `4f59a8d…`): the whole Playwright log, every
  project's own log, the `[e2e-diag]` lines, `commit.txt`, `exit-status.txt`, `diagnostics-validity.txt`, `counts.txt`. All nine
  projects passed their tests and its validity checks, and it recorded no reset (section 2).

(The attempt-1 and attempt-2 jobs are different job IDs of the same run; `gh run view --job <old id> --log` returns the
rerun's log, which is why the direct API was used.)

## 2. Observations (supporting context, not proof of cause)

Everything in this section is read straight from the logs. None of it establishes why a connection was reset: a
timing that coincides is a lead to test, not an explanation, and no causal claim is made here or anywhere in this change.

The same in all three logs:

- The failing request is a **GET** to the fake lake: `url: 'http://localhost:9999/v2026-10-01/data/query/production?query=…'`
  with `tag: 'next-loader.fetch.cache-components'`, `useCdn: true`, `canUseCdn: true`, `maxRedirects: 0`,
  `fetch: undefined`, `timeout: { connect: 300000, socket: 300000 }`, `attemptNumber: 5`, `method: 'GET'`.
- It fails with `read ECONNRESET` (errno -104), while Next prerenders `/blog/news-update`; the web server then does not start.
- The lake wrote no `fake-sanity socket error`, no `client closed early` and no `exiting with code` line. It wrote only
  `event loop stalled` lines (14, 78 and 158 in the three logs, up to 3402, 3624 and 3671 ms) and `slow request` lines
  (1, 7 and 12; the ones named are `POST …/data/query/production…`, 2.6 to 2.7 s).
- In each log the last stall of 3 s or more **began within about 0.04 to 0.13 s of the start of a 2.6 to 2.7 s
  `POST …/data/query/production` that the lake logged as slow** (its start worked out from the time it was logged
  and its duration: the stall began 0.040 s, 0.105 s and 0.127 s before it in the three logs, and lasted longer, 3402,
  3274 and 3671 ms). The lake evaluates GROQ on its one thread, which its own comments say is synchronous. The logs show
  the two coincide; they do not show what in the build sent that query, or that either has anything to do with the reset.
- The last stall of 3 s or more was logged **3.43 s, 3.57 s and 3.55 s** before the first `fetch failed` line
  (the lake logs a stall when it ends). Those three numbers are what the log shows; they are not a cause.

Different between them: only the step (the first is the app's own build in a shard; the others are the isolated job's
steps) and the amount of earlier noise.

The fourth failure (`job-133031068347.log.gz`, run 43785167062, diagnostics off) differs: the failing page is
`/edge-layer-colours` (the fixture page added by #215, which is also prerendered in every successful build), the request is
a **POST** `…/data/query/production` with a body, and it carries no `attemptNumber` (a POST that fails with no response is not
retried, section 3). The error line was logged 0.19 s after a 3.5 s stall ended. The same observations hold: the lake logged no
socket error, early close or exit; nothing here says why.

The fifth failure (`job-133093273990.log.gz`, run 43804889468, commit `4f59a8d…`, diagnostics off) has the signature of the first
three: a GET for `/blog/news-update`, `attemptNumber: 5`, `read ECONNRESET` (errno -104), and the web server does not start. The
lake wrote no socket error, early close or exit, only 68 `event loop stalled` lines (up to 3472 ms) and 6 `slow request` lines. The
last stall of 3 s or more (3472 ms) was logged 3.65 s before the first `fetch failed` line.

**The corrected capture** (`capture-43804915434/`, run 43804915434, on the same commit `4f59a8d…`, diagnostics on) is the first
whose client half was valid:

- All nine projects passed their tests (157 tests, all on the first attempt) **and** the capture's validity checks: in every
  project the client recorded exactly as many `/data/` requests as the lake served (187, 203, 230, 191, 174, 298, 194, 181 and 190;
  1,848 in all), fetch requests came from production-build processes, every response-header record had its request and socket
  records, and no process exhausted its logging budget. Those are coverage checks on aggregate counts; they do not prove that
  every request was observed.
- 147 processes wrote a `preload` line; **36 of them wrote `fetch-request` records** (27 in Next's `phase-production-build`, 9 in
  other processes).
- It recorded **no reset**: no `ECONNRESET`, no client `fetch-error` or `fetch-connect-error`, and no lake connection close with an
  error. Coverage of the build's requests was demonstrated without reproducing the failure, so the capture says nothing about
  what causes the failure, and nothing about stability: **ordinary CI on the same commit failed again** (the fifth failure, above).
- The lake's longest stall was 2,627 ms; none reached 3 s (164 stalls, 28 of 1 s or more, 13 slow requests).

Across the six runs, then, a lake stall of about 3.3 to 3.7 s was logged shortly before each of the five failures, and none of
3 s or more occurred in the one run that did not fail. That is an association between observations, kept here as one; it is not
evidence that the stall, the CPU or anything else caused a reset.

Not in the logs, so not known: which side closed the connection; whether the failing sockets were reused ones; the
sockets' ages or idle times; what undici's connection pool held; what the runner's load was; what the site's
build workers were doing.

## 3. The transport that is actually used (corrected)

The first version of this document, and the description of PR #216 that merged it, said the site's Sanity reads use
`node:http` through a keep-alive `http.Agent` (30 sockets). **That was wrong for the path that failed.** The first
capture showed it: the lake served 2,142 requests and the client logger, which watched `node:http`, recorded none. The
trace, from the installed sources and the failing logs:

1. **The export Next selects.** The app reads through `sanityFetch` from `defineLive` (`src/lib/sanity/live.ts`, from
   `next-sanity/live`). The failing requests carry the tag `next-loader.fetch.cache-components`, which appears only in
   `node_modules/next-sanity/dist/live/conditions/next-js/index.js` (next-sanity **13.3.4**), so that is the file in use. Its
   `sanityFetch` calls `client.fetch(query, params, { filterResponse: false, perspective, variant, stega, useCdn,
cacheMode, tag, token })`, with no `next` or `cache` option.
2. **The nested SDK.** `client` is `createClient` from `next-sanity`, which uses next-sanity's own nested `@sanity/client`
   **7.27.0**. The top-level `@sanity/client` 8.9.0 and `get-it` 9.6.1 are not on this path.
3. **The builds Next's `react-server` condition selects.** That client's `exports["."]["react-server"]` is
   `dist/index.browser.js`. Its HTTP layer is next-sanity's nested **get-it 8.8.3**, whose `exports["."]["react-server"]`
   is `dist/index.react-server.js` and `exports["./middleware"]["react-server"]` is `dist/middleware.browser.js`.
4. **The adapter.** `get-it` 8.8.3's `index.react-server.js` is an `XMLHttpRequest`-shaped adapter whose `send` calls the
   global **`fetch`** (`fetch(this.#t, r)`), and it marks a failure `isNetworkError = true` and attaches the request:
   the `isNetworkError: true` and `request: {…}` in the logs, under `TypeError: fetch failed`, undici's message. In a
   server process the global `fetch` is Next's patched fetch over Node's own **undici**.
5. **So** GET and POST alike go through undici and its connection pool. The `agent({ keepAlive: true, maxSockets: 30,
… })` middleware and the `node:http` adapter belong to the Node build (`index.js`), which this path does not use.
   (Where the Node build is used, the call's own `next` or `cache` option also selects `fetch`.) `http.Agent` metrics
   therefore say nothing about this traffic and are not used as a stand-in.

**Retries, by what failed** (the `react-server` builds above; `maxRetries` unset means 5 in `get-it`'s `retry`
middleware, delay `100 * 2^attempt + random(0..100)` ms, so 100, 200, 400, 800, 1600 plus up to 100 each, **3.1 to 3.6 s**
in all, and the retry stops when `attemptNumber` reaches `maxRetries`):

- a **GET or HEAD** that fails with no response (`isNetworkError`) is retried up to that budget;
- a **POST** to `/data/query…` that fails with no response (a reset connection) is **not** retried;
- a GET, a HEAD or **a POST to `/data/query…`** that is answered `429`, `502` or `503` **is** retried;
- any other response status is not retried.

`attemptNumber` is set by that middleware on each retry's options: **zero-based, the number of retries already made**.
`attemptNumber: 5` is the last attempt the budget allows, the sixth in all, and its failure is the one thrown. This is
what the logs show: the three failures on a GET carry `attemptNumber: 5`, and the failure on a POST (run 43785167062)
carries none. The raw counter stays in the error Next prints; the diagnostics do not reinterpret it (they count fetches
per URL as `sameUrlOrdinal`, a different thing, named differently). The 3.1 to 3.6 s of backoff matches the 3.43 to 3.57 s
in section 2 for the GET failures; that is arithmetic, and does not say why every attempt failed.

## 4. Hypotheses (unproven; each says what would support or count against it)

How to read the capture: the lake and the site write their lines from callbacks in different processes, through
different pipes, and Playwright interleaves them. A line's timestamp says when that process ran its callback and wrote
the line, **not when a packet crossed the wire**, and two lines a millisecond apart say nothing about which side closed a
connection first. So the records are used to ask what each side _saw_ and whether those are consistent with a
hypothesis; which side closed first on the wire cannot be settled from them (that would need a packet capture, which this
does not take). Within one process, `mono` orders its own lines; across processes, only the connection (the two ports)
ties records together. undici's channels name a request's socket only when the request is written to one, publish no
"reused" flag and no pool state, so none is reported or inferred beyond a count of the requests written to a socket.

H1. **A pooled connection that the lake has closed (or is closing) is used again.** undici (Node's global dispatcher) keeps
idle keep-alive connections and retires them on its own timers (documented to take the server's `Keep-Alive` hint, which
the lake sends as `timeout=5`, less a threshold of its own; **not measured here**). The lake closes an idle socket after
`keepAliveTimeout` **plus** `keepAliveTimeoutBuffer` where Node has that setting (1000 ms by default in the capture's Node,
so 6 s with the other default; the `settings` line records the real values). If a request is written to a connection the
lake closes in that gap, for example while the building process's thread is busy, it would meet a closed socket.
_Supported_ by: client `fetch-error` records with `ECONNRESET` on a socket whose `requestsOnSocket` is above 1 and whose
`msSinceSocketLastResponseEnd` is near or beyond what the lake allows, and lake `connection-close` records for the same two
ports with an idle time at close of about that length. _Counts against_: errors on a socket's first request
(`requestsOnSocket` 1), or idle times well inside the lake's allowance.

H2. **The lake or the runner dropped connections for another reason** (backlog, resource limits, a signal).
_Supported_ by: lake `connection-close` with `hadError: true`, an `exiting` line, or load or memory samples that show
pressure. _Counts against_: the lake recording every affected connection closing without an error.

H3. **A reset at the Node or kernel level not tied to the lake's idle timers.** _Supported_ by: a client `fetch-error` on a
socket that was new or recently used, and lake records that show no idle expiry for that connection. _Counts against_: the H1
pattern above.

**`fetch-socket-close` with `hadError: true` does not, by itself, establish that a request failed, and does not support H3 or
any other reset hypothesis.** Node reports `hadError: true` on a socket's `close` whenever the socket was destroyed with an
error object (Node v24.22.2,
[`lib/net.js` L1174 and L1183](https://github.com/nodejs/node/blob/v24.22.2/lib/net.js#L1174-L1183):
`const isException = exception ? true : false` … `this.emit('close', isException)`), and the undici that Node v24.22.2 bundles
(7.30.1) retires an idle keep-alive connection exactly that way. When a response carries a `Keep-Alive: timeout=N` hint it sets
the idle timeout to `N * 1000` less `keepAliveTimeoutThreshold`, 2000 ms by default
([`client-h1.js` L648-L663](https://github.com/nodejs/node/blob/v24.22.2/deps/undici/src/lib/dispatcher/client-h1.js#L648-L663),
defaults in [`client.js` L253-L255](https://github.com/nodejs/node/blob/v24.22.2/deps/undici/src/lib/dispatcher/client.js#L253-L255)),
arms it when the connection goes idle
([L1091-L1094](https://github.com/nodejs/node/blob/v24.22.2/deps/undici/src/lib/dispatcher/client-h1.js#L1091-L1094)), and on
expiry calls `util.destroy(socket, new InformationalError('socket idle timeout'))`
([L817-L819](https://github.com/nodejs/node/blob/v24.22.2/deps/undici/src/lib/dispatcher/client-h1.js#L817-L819)), which calls
`socket.destroy(err)` ([`lib/core/util.js` L378-L389](https://github.com/nodejs/node/blob/v24.22.2/deps/undici/src/lib/core/util.js#L378-L389)).
With the lake's `timeout=5` hint that is 5000 - 2000 = 3000 ms.

In the corrected capture, which recorded no request error at all, **all 507** client `fetch-socket-close` records have
`hadError: true`; 493 of them closed 3.0 to 3.5 s after the last response on the socket ended (the shortest 2.999 s, the longest
4.08 s). Most of them are therefore consistent with that idle-expiry path. The records do not say which code path closed any
given socket, and undici has other places that destroy a socket with an error, so no close, and certainly not every close, is
attributed to idle expiry by these records alone.

The stalls, the load samples and the process lists are context. A stall in the log is not evidence that CPU or the stall
caused anything, and none of these hypotheses is accepted until a capture supports it and something else could not
explain it equally well. A capture that does not reproduce the failure shows nothing about stability.

## 5. What the diagnostics record

Opt-in with `E2E_DIAGNOSTICS=1` (`playwright.config.ts` passes `E2E_LAKE_DIAGNOSTICS=1` to the lake, and
`E2E_HTTP_DIAGNOSTICS=1` plus an `--import` of `http-client-diagnostics.mjs` through `NODE_OPTIONS` to the site's build
and server processes and their workers). Every line is `[e2e-diag] {json}` on stderr with `at`, `mono`, `source`,
`pid`.

Lake (`lake-diagnostics.mjs`):

- `settings` once: Node version, port, `keepAliveTimeout`, `keepAliveTimeoutBuffer` (null where Node has no such
  setting), `headersTimeout`, `requestTimeout`, `timeout`, `maxRequestsPerSocket`, `maxHeadersCount`.
- `connection-open` / `connection-close`: a connection id, both endpoints (address, family, port), requests served, lifetime,
  idle time at close, bytes, `hadError`.
- `request` / `response-finish` / `response-closed-early`: connection id, sequence on the connection, method, a clipped
  path, `urlKey` (of the whole URL, before clipping), idle time before the request, status, duration.
- `sample` every 5 s (at most 240): load average, free memory, open connections, and up to 12 processes that look like the
  build or tests (`ps`: pid, ppid, %cpu, rss, elapsed, a clipped command line). Context only.

Client, for requests to a watched **port** (`http-client-diagnostics.mjs`, which loads both loggers). The filter is a port
number and nothing else: the watched ports are `E2E_DIAGNOSTICS_PORTS`, else `FAKE_SANITY_PORT`, else 9999, and a request is
watched when its port is one of them, whatever host it names; hosts, origins and addresses are not compared, only recorded.
Every client record carries the process (`pid`, `thread`) and Next's `phase` (`phase-production-build` in the build's workers).

- `preload` once per process (pid, ppid, script, thread). It is the only line a process writes for traffic on ports it is not
  watching, which write nothing and spend none of the line budget.
- **The site's reads (`undici-client-diagnostics.mjs`, undici's `undici:*` channels, the transport of section 3):**
  `fetch-request` (method, origin, a clipped path, `urlKey`, `sameUrlOrdinal`), `fetch-socket-connected` (a connection was
  made: the socket's id and both endpoints) and `fetch-connect-error` (code, errno, syscall, port), `fetch-socket` (the request
  written to a socket: socket id, **`requestsOnSocket`**, the socket's age, the time since the last response on it ended, both
  endpoints; the only point at which undici's channels tie a request to a socket, so a request that failed earlier has none),
  `fetch-headers` (the response's **headers** arrived, with status), `fetch-complete` (undici has received the **whole
  response**; whether the application has read it is neither known nor asked), `fetch-error` (code, errno, syscall, the cause's
  code, a clipped message, time since the request began, and its socket if it had one) and `fetch-socket-close` (`hadError`,
  which alone is not a request failure: see H3; requests, age). A socket's **endpoints** are address, family and port for each end (`localAddress`, `localFamily`,
  `localPort`, `remoteAddress`, `remoteFamily`, `remotePort`), as Node reports them. There is no connection-time metric: the one
  that was here read null in every record. No headers are logged, no body is read or locked, and the application's own
  `attemptNumber` is not seen.
- **Anything using `node:http` (a first logger, kept for any other traffic and for the Node build of the SDK; it recorded none of
  the site's reads in the first capture):** `request-created`, `request-socket` (with `reusedSocket`, which is `node:http`'s,
  and the endpoints), `request-start`, `response`, `response-complete` / `response-closed`, `request-error`, `socket-created`,
  `socket-connected`, `socket-close`.

What it never does: change a request, header, status, body, timeout, retry or pool setting; read or consume a stream;
add a `clientError` listener to the server (which would replace Node's default answer) or an `error` listener to a
request (which would stop an unhandled error from throwing). It only subscribes to diagnostics channels and adds
`connection`, `socket`, `connect`, `free`, `end`, `close` and `finish` listeners, and a `request` listener on the lake
that is added **ahead of** the lake's own handler (so a request is recorded before the handler's synchronous work, not
after it) and runs beside it. None has a default behaviour to replace.
Each handler is guarded and the log has a line budget (`E2E_DIAGNOSTICS_MAX_LINES`, default 4000 per process) after
which it writes one notice and counts the rest. Tests: `scripts/lake-diagnostics.test.mjs` (real child processes, with
the diagnostics on and off).

## Correlating records

What is recorded (facts) and what may be read into it (interpretation) are kept apart here.

**Recorded facts, and the keys that tie them together.**

- `urlKey`: the first 8 hex digits of a SHA-1 of `<METHOD> <whole path including the query string>`, computed before any
  clipping, on the lake's `request` records and on both client loggers' request records. It is the same function
  (`requestKey` in `diagnostics-log.mjs`) on each, so the same request has the same key at both ends.
- A connection's **endpoints**: address, family and port at each end, on the lake's `connection-open` and on the client's
  `fetch-socket-connected`, `fetch-socket` and (for `node:http`) `request-socket`. A client socket's local endpoint is the
  lake connection's remote one, and the other way round.
- `reqSeq` with `pid` and `thread` identifies a client request within a capture; `socketId` a client socket within a process;
  `connId` a lake connection.
- `mono` orders one process's own lines; timestamps across processes are only when each callback ran.

**What these support, and what they do not.**

- Equal `urlKey`s are a correlation key, not proof that two records are one request: it is a 32-bit hash, and requests to the
  same URL (a client's retry, two pages asking for the same data) share it. It is not proof that they are not one request either.
- Matching endpoints on a client socket and a lake connection identify the same TCP connection; they do not say which side
  closed it first, or why. The timestamps do not either (section 4).
- `requestsOnSocket` and `msSinceSocketLastResponseEnd` are counts and times from the client process's callbacks. undici
  publishes no "reused" flag and no pool state, so nothing here says what its pool did.
- Aggregate counts in the capture's validity check are **coverage checks**: they catch a client half that recorded fewer
  requests than the lake served, and they do not prove that every request was observed (equal counts can hide a missed
  request and an extra one).

## 6. The one manual capture mechanism (not dispatched)

`.github/workflows/e2e-lake-capture.yml`, run by hand with `workflow_dispatch`. **No capture is to be dispatched again
until the demonstrated coverage of this client logger has been reviewed.** What is demonstrated, and what is not:

- **Adapter-path coverage (tested).** `scripts/undici-diagnostics.test.mjs` runs the installed next-sanity client, and the
  app's real client options read from `src/lib/sanity/client.ts`, in a plain Node process against a local server, resolved as
  Next resolves it (`--conditions=react-server`). It shows the logger recording GET and POST requests, their sockets, response
  headers, completion and errors (a reset, a reset on a socket the records show was used before, a refused connection with no
  socket) on that adapter path, and that under the default conditions the same client reaches the lake over `node:http`
  instead. This is the adapter path, **not coverage of Next's own build**: Next patches `fetch`, bundles the SDK and makes the
  requests from its build workers, none of which those tests run.
- **Next's build (not yet shown).** Only a capture can show whether the logger sees what the build requests; the validity
  check below is what makes a capture that cannot show it fail.

It is the only way the diagnostics are switched on in CI, and it is reviewable as a file:

- **Default off.** It has no `push`, `pull_request` or `schedule` trigger, and `E2E_DIAGNOSTICS` is set nowhere else, so
  the ordinary pipeline is unchanged and this adds no job to it.
- **One isolated job**, `ubuntu-latest`, running the `e2e (isolated)` job's own steps in its order with its commands
  (`npx playwright test --project=<name> --no-deps`, with the same `E2E_TIMINGS_FILE` values), plus `E2E_DIAGNOSTICS=1`.
  Like the job, it stops at the first failing project.
- **Bounded runtime.** The capture step has `timeout-minutes: 25` and the job `35`, so a hang there is stopped while the
  steps that keep the log can still run. There is no loop, no retry and no rerun.
- **Exact commit recorded.** The input is a full 40-character SHA, checked against that pattern and against what was
  checked out; `commit.txt` (requested and checked-out SHA, run id, attempt) is in the artifact and the run summary.
- **Capture validity** (`scripts/e2e-capture-validity.mjs`, after each project). Aggregate **coverage checks**, which catch a
  client half that recorded fewer requests than the lake served and do **not** prove that every request was observed: (1) the
  lake's `/data/` requests, fixture-control traffic (`/__fixture/…`) left out, against the client's request records for
  `/data/` paths (`fetch-request`, or `request-created` for `node:http`). The client must have recorded **at least as many** as
  the lake served: none at all is `no-client-requests`, any fewer (99 of 100 included) is `partial-coverage`, and there is no
  adjustable threshold. A client count above the lake's is not an error (a request can fail before the lake logs it, or be
  retried), and equal counts can still hide a missed request and an extra one; (2) at least one
  `fetch-request` from a `phase-production-build` process (the failing requests are made while the site is built), else
  `no-production-build-fetch`; (3) every `fetch-headers` record has the `fetch-request` and `fetch-socket` records of the same
  request, else `unmatched-response-headers`; (4) no process hit its line budget (`limit-reached`), else `truncated`.
  Incomplete instrumentation exits 70, truncated-only evidence 71, and either **stops the capture before any further
  project**. No lake `/data/` traffic is not a failure of the diagnostics. The preserved first capture (1,855 lake `/data/`
  requests, no client request) is `no-client-requests`, and with one synthetic client request added it is `partial-coverage`
  (1 of 1,855); both are tested. Whether the logger sees the requests of **Next's own build** is shown only by a capture; this
  check is what makes a capture that cannot show it fail.
- **Test status and diagnostic validity are kept apart.** `exit-status.txt` holds each project's test result,
  `diagnostics-validity.txt` each project's validity. The step exits with the first failing test's status; with passing tests
  and incomplete instrumentation it exits 70. Both files, the whole log, the project logs, the `[e2e-diag]` lines and counts
  (including how many processes exhausted their line budget) are uploaded by `if: always()` steps, 30 days.
- **Exit status preserved.** `set -o pipefail` and `PIPESTATUS[0]` make each project's result Playwright's, not `tee`'s.
  `scripts/e2e-capture-validity.test.mjs` runs the step's own script against a stand-in `npx` to show each of these.

Using it: after review, dispatch it once with the exact commit that contains it. The failure is intermittent, so a
capture may not catch it; if it does not, say so and stop (do not dispatch it again to chase the failure). If it does, read
the failing client `fetch-error` records (code, `requestsOnSocket`, the socket's age and the time since its last response),
the lake `connection-close` records for the same two ports, and the `settings` line, and weigh H1 to H3 as described in
section 4, remembering what the timestamps cannot say. Any mitigation (a timeout, a keep-alive setting, a retry) is a separate
change, decided after reading the capture.
