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

(The attempt-1 and attempt-2 jobs are different job IDs of the same run; `gh run view --job <old id> --log` returns the
rerun's log, which is why the direct API was used.)

## 2. Observations (what the logs say, and nothing more)

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
  the two coincide; they do not show what in the build sent that query, or that it matters to the reset.
- The last stall of 3 s or more was logged **3.43 s, 3.57 s and 3.55 s** before the first `fetch failed` line
  (the lake logs a stall when it ends). Those three numbers are what the log shows; they are not a cause.

Different between them: only the step (the first is the app's own build in a shard; the others are the isolated job's
steps) and the amount of earlier noise.

Not in the logs, so not known: which side closed the connection; whether the failing sockets were reused ones; the
sockets' ages or idle times; how many sockets the client's Agent held; what the runner's load was; what the site's
build workers were doing.

## 3. The transport that is actually used

`src/lib/sanity/client.ts` creates its client with `createClient` from `next-sanity` (13.3.4). That package carries its
own `@sanity/client` **7.27.0** with its own `get-it` **8.8.3** (the top-level `@sanity/client` 8.9.0 and `get-it` 9.6.1,
which use undici's `fetch`, are not on this path). Reading those sources:

- get-it 8.8.3's Node adapter calls `node:http`'s `request` (`maxRedirects: 0` selects the native `http` module, not
  `follow-redirects`). A GET is a GET; there is no POST on the failing path (the POSTs in the log are other, slow queries).
- `@sanity/client` 7.27.0 adds get-it's `agent({ keepAlive: true, maxSockets: 30, maxTotalSockets: 256 })` middleware:
  one keep-alive `http.Agent` per client, up to 30 sockets. It does **not** add get-it's separate `keepAlive` middleware
  (the one that retries once on `ECONNRESET` over a reused socket).
- Retries are get-it's `retry` middleware with `@sanity/client`'s `shouldRetry`: up to `maxRetries` (default 5), delay
  `100 * 2^attempt + random(0..100)` ms (so 100, 200, 400, 800, 1600 plus up to 100 each, **3.1 to 3.6 s** in all), for
  a GET with no response and an error `is-retry-allowed` accepts (`ECONNRESET` is).
- `attemptNumber` is set by that middleware on the options of each retry: **zero-based, the number of retries already
  made** for this request. `attemptNumber: 5` with `maxRetries` 5 is the last attempt the budget allows, the sixth try
  in all, and its failure is the one thrown. The raw counter stays in the error Next prints; the diagnostics do not
  reinterpret it (they count HTTP attempts per URL as `sameUrlOrdinal`, a different thing, named differently).
- The 3.1 to 3.6 s of backoff matches the 3.43 to 3.57 s above. That is arithmetic, noted in case it helps; it does not say
  why every attempt failed.

## 4. Hypotheses (unproven; each says what would confirm or refute it)

H1. **Stale pooled sockets.** The Agent keeps idle keep-alive sockets. If the lake closes idle sockets (its own
`keepAliveTimeout`, 5 s by default) while its one thread is stalled, Node runs the expired timers before reading the
sockets' pending requests, so a request already sent over a pooled socket meets a closed one and is reset; with several
stale sockets pooled, each retry could pick another. _Confirmed_ by: client attempts with `reusedSocket: true`, large
`idleMsBeforeUse`, and lake `connection-close` lines with `idleMsAtClose` near `keepAliveTimeout` that precede the
failing attempts, and an Agent holding several free sockets. _Refuted_ by: failing attempts on fresh sockets
(`reusedSocket: false`), or no lake-side close of those connections.

H2. **The lake or the runner dropped connections for another reason** (backlog, resource limits, a process signal).
_Confirmed_ by: `connection-close` with `hadError: true`, an `exiting` line, or load/memory samples that show it.
_Refuted_ by: the lake's records showing every failing connection closing cleanly after idle time.

H3. **A Node or undici-level reset unrelated to the lake's timers** (kernel RST on a half-closed socket). _Confirmed_
by: the client `socket-close` with `hadError` and a lake `connection-close` that shows the lake did not close first.

The stalls are context, not a cause: a stall in the log is not evidence that CPU or the stall caused anything.

## 5. What the diagnostics record

Opt-in with `E2E_DIAGNOSTICS=1` (`playwright.config.ts` passes `E2E_LAKE_DIAGNOSTICS=1` to the lake, and
`E2E_HTTP_DIAGNOSTICS=1` plus an `--import` of `http-client-diagnostics.mjs` through `NODE_OPTIONS` to the site's build
and server processes and their workers). Every line is `[e2e-diag] {json}` on stderr with `at`, `mono`, `source`,
`pid`.

Lake (`lake-diagnostics.mjs`):

- `settings` once: Node version, port, `keepAliveTimeout`, `keepAliveTimeoutBuffer` (null where Node has no such
  setting), `headersTimeout`, `requestTimeout`, `timeout`, `maxRequestsPerSocket`, `maxHeadersCount`.
- `connection-open` / `connection-close`: a connection id, both ports, requests served, lifetime, idle time at close,
  bytes, `hadError`.
- `request` / `response-finish` / `response-closed-early`: connection id, sequence on the connection, method, a clipped
  path, idle time before the request, status, duration.
- `sample` every 5 s (at most 240): load average, free memory, open connections, and up to 12 processes that look like the
  build or tests (`ps`: pid, ppid, %cpu, rss, elapsed, a clipped command line). Context only.

Client (`http-client-diagnostics.mjs`), for requests to the lake's port only, through `node:http`'s diagnostics channels:

- `preload` per process (pid, ppid, script, thread), `socket-created`, `socket-connected` (both ports), `socket-close`
  (`hadError`, requests, age, idle at close).
- `request-created` (the Agent's free, in-use and queued socket counts at that moment), `request-socket` (socket id,
  **`reusedSocket`**, socket age, idle time since its last response), `request-start`, `response`, and `request-error`
  (code, errno, syscall, time since start, socket id, reuse, age, idle).

What it never does: change a request, header, status, body, timeout, retry or pool setting; read or consume a stream;
add a `clientError` listener to the server (which would replace Node's default answer) or an `error` listener to a
request (which would stop an unhandled error from throwing). It only subscribes to diagnostics channels and adds
`connection`, `request`, `socket`, `connect`, `close` and `finish` listeners, which have no default behaviour to replace.
Each handler is guarded and the log has a line budget (`E2E_DIAGNOSTICS_MAX_LINES`, default 4000 per process) after
which it writes one notice and counts the rest. Tests: `scripts/lake-diagnostics.test.mjs` (real child processes, with
the diagnostics on and off).

## 6. One bounded CI capture (not dispatched)

To be run only after this is reviewed and merged, once, on a single commit that has the diagnostics. The ECONNRESET
is intermittent, so one capture may not catch it; it is bounded, not guaranteed.

1. One run of the `e2e (isolated)` job (the job that failed twice on the merge commit) with `E2E_DIAGNOSTICS=1` set for
   that job only (a one-line, temporary workflow change in its own PR or a dispatch input; no other job, no timeout or
   retry change). The job's own steps keep their usual order and commands.
2. Keep the job's complete log and upload the `[e2e-diag]` lines as an artifact.
3. If the failure occurs: read, in order, the failing client `request-error` lines (code, `reusedSocket`, socket age and
   idle, Agent counts), the lake `connection-close` lines for the matching ports, and the `settings` line, then judge H1 to
   H3 by the rules above. If it does not occur, say so and stop; do not rerun to chase it.
4. Whatever the result, any mitigation (a timeout, a keep-alive setting, a retry) is a separate change decided after
   reading the capture.
