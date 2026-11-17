# Keep-alive expiry race: Node-only experiment evidence

Review evidence for the lake's `keepAliveTimeout: 0` (`tests/e2e/fake-sanity.mjs`; `../../README.md` section 7). It shows a
**mechanism** in a synthetic two-process harness. It is **not** evidence about any CI run, and it does not attribute any
historical CI `ECONNRESET` to this mechanism.

Kept as run, unedited: the harness files are byte-for-byte the files that produced the records, so they are excluded from
ESLint and Prettier rather than reformatted. They are not tests: nothing imports them, Vitest only runs `*.test.*` files under
`scripts/`, `src/` and `migrations/`, and Playwright only runs `*.spec`/`*.test` files, so normal CI never executes them. The
synthetic blocking code (a busy-wait in a request handler) exists only here, never in the fake lake.

## How it was run

- Runtime: Node **v24.22.2** darwin-arm64 (bundled undici **7.30.1**, libuv 1.52.1), from
  `https://nodejs.org/dist/v24.22.2/node-v24.22.2-darwin-arm64.tar.gz`, SHA-256
  `aa9549349e47dffaa42dcf95d6e06ade8c4bdafc980979883b88767670df385a`, checked against the published `SHASUMS256.txt`
  (its GPG signature was not checked). Run from a temporary directory with `NODE_OPTIONS` cleared; nothing installed.
- OS: macOS 26.6.2 (25G83), arm64. **CI runs Linux**; what the kernel sends when a socket with unread data is closed, and
  the timing, may differ there.
- Each case: a fresh server process and a fresh client process (`runner.mjs` spawns both, then kills the server). The
  client warms one keep-alive connection with the global `fetch` (undici); 1000 ms after that response it opens a second
  connection (`node:http`, `agent: false`) whose request makes the server busy-wait; 2000 ms after the warm response it
  sends the next request on the warm connection. No case resets or destroys the target socket itself; the server observes
  only through socket-level listeners, so Node's default timeout handling (`socketOnTimeout` destroys the socket when no
  request, response or server `timeout` listener exists) is unchanged.
- Times in the records are when each callback ran (`performance.timeOrigin + performance.now()`, ms), not wire events;
  across the two processes they agree to about a millisecond.
- **The runner's exit status is not an outcome.** It exits 0 whenever both processes finish. Each outcome below is read from
  the records: whether the server parsed the reused request, whether its socket timeout fired, and what the client's
  `reuse-outcome` record says.

Commands (`$N` is the downloaded Node binary):

```
env -u NODE_OPTIONS $N harness/runner.mjs $N <out>          # 2026-11-16T07:40:37Z: control, race
env -u NODE_OPTIONS $N harness-policy/runner.mjs $N <out>   # 2026-11-16T08:02:33Z: default-get, candidate-get, candidate-post
```

`harness-policy/` is `harness/` plus: a server policy argument (`default`: `keepAliveTimeout` 5000, buffer 1000;
`candidate`: `keepAliveTimeout` 0, the fake lake's new setting, nothing else), POST bodies read by the server, a client
method argument (POST sends a 1073-byte JSON body), the `connection` response header recorded, the block fixed at 6000 ms
for every case, and a 35 s watchdog (25 s in `harness/`). Each runner ran once; there was no retry and no timing search.

## Outcomes, from the records

Times are ms after the server finished the warm response (its 6000 ms deadline is +6000 under the default policy).

| Case             | Policy, method  | Block   | Reused (client port = server port) | Server timer       | Reused request parsed | Client outcome                          |
| ---------------- | --------------- | ------- | ---------------------------------- | ------------------ | --------------------- | --------------------------------------- |
| `control`        | default, GET    | 3000 ms | yes, at +2005.1 (idle 2003.6 ms)   | 6000, did not fire | +4013.4               | 200                                     |
| `race`           | default, GET    | 6000 ms | yes, at +2003.7 (idle 2002.2 ms)   | fired +7044.9      | never                 | `ECONNRESET` (read, errno −54), +7046.0 |
| `default-get`    | default, GET    | 6000 ms | yes, at +2005.9 (idle 2003.5 ms)   | fired +7016.5      | never                 | `ECONNRESET` (read, errno −54), +7017.9 |
| `candidate-get`  | candidate, GET  | 6000 ms | yes, at +2002.7 (idle 2001.3 ms)   | none set           | +7012.1               | 200                                     |
| `candidate-post` | candidate, POST | 6000 ms | yes, at +2006.3 (idle 2005 ms)     | none set           | +7012.7 (1073 B body) | 200                                     |

Where the timer fired, the server's records show `destroyed: false` just before Node's own timeout handler and `destroyed:
true` just after it, then a close with `hadError: false`; the client's socket closed with `hadError: true`. Socket byte
counters (what Node's socket objects counted, **not** a measurement of kernel buffers): in `race` and `default-get` the
server's socket read 174 bytes of the 349 the client's socket wrote, the difference being the size of the reused request.
Response headers: `Connection: keep-alive` with `Keep-Alive: timeout=5` under the default policy; `Connection: keep-alive`
and no `Keep-Alive` header under the candidate.

## Files

| File                           | Produced by / what                      | SHA-256                                                            | Bytes |
| ------------------------------ | --------------------------------------- | ------------------------------------------------------------------ | ----- |
| `harness/server.mjs`           | experiment 1 server                     | `ce36ab85c189ae05e12b39ecd2cdd3ee302219ddb1a058965d3f31d02c0b4a99` | 3032  |
| `harness/client.mjs`           | experiment 1 client                     | `ae5ae001681805785caba2bcb44d7bf140f0ab9de90a4eec0a5618a0017791c7` | 4565  |
| `harness/runner.mjs`           | experiment 1 runner (25 s watchdog)     | `e64ab35b33f67c288e927840d192d0e4aaefbccdd6fcbff9b4649ba1c84dda92` | 1942  |
| `harness-policy/server.mjs`    | experiment 2 server (policy argument)   | `0d903e8637c50cd13789bafb3a43b402afe761c60f8558b2f9a68c560f732283` | 3652  |
| `harness-policy/client.mjs`    | experiment 2 client (method argument)   | `538b79fd1ebe7afac64afe0b3afaced372cb4443b1868cc7adfc48778610162a` | 4971  |
| `harness-policy/runner.mjs`    | experiment 2 runner (35 s watchdog)     | `802e8b929a339fd6b1aadea787526b3432b27238752afeab3f87b3d1b404a50b` | 2181  |
| `records/control.jsonl`        | `harness/`, 2026-11-16T07:40:37Z        | `403678650f6ee8e943620af95b3e4cc8e36b67b0c839e3d7520e019ab447a672` | 3643  |
| `records/race.jsonl`           | `harness/`, 2026-11-16T07:40:37Z        | `1bd7f95ac8b4cd8c427fc0885b8b81969109286ed7339dc27a8f1ba04e8de1d6` | 3612  |
| `records/default-get.jsonl`    | `harness-policy/`, 2026-11-16T08:02:33Z | `37aa5ccc8da6d23d21893c3978e5f00c865bf28ed1253793c5a2f462ab513871` | 3789  |
| `records/candidate-get.jsonl`  | `harness-policy/`, 2026-11-16T08:02:33Z | `0051605994ac47bbad8f26054f3174f6ec39e16c51ca5ec74ec6b58c1390bf70` | 3872  |
| `records/candidate-post.jsonl` | `harness-policy/`, 2026-11-16T08:02:33Z | `7cf7bae7194a5723bc9ce4fa81d3ee30048c34d19677398c3cd7530582496695` | 3980  |

Check with `shasum -a 256 -c SHA256SUMS` from this directory.

## What this shows, and what it does not

- **Shown** (Node 24.22.2, undici 7.30.1, macOS): under Node's default keep-alive policy, a request written to a reused
  connection inside the client's idle limit (3000 ms here) is lost when the server's one thread is busy past its 6000 ms
  socket timeout: the timer fires before the request is read, Node destroys the socket, and the client gets `ECONNRESET`.
  With `keepAliveTimeout: 0`, the same schedule completes, for a GET and for a POST.
- **Not shown**: the same on Linux; the race in the real fake lake under a real build (only its settings and headers were
  checked, by `scripts/lake-diagnostics.test.mjs`); and that any historical CI failure was this race.
