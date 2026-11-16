# Evidence manifest

Raw CI logs and capture files for the investigation of the build's connection resets (`../README.md`), kept as they were
fetched. `.gz` files are gzip of the original file; the SHA-256 is of the **uncompressed** content, so it can be checked with
`gunzip -c <file> | shasum -a 256`. Nothing was edited. Job logs came from the direct job-log API
(`gh api --allow-escape-sequences repos/CurrawongCreativeCo/nocturne/actions/jobs/<job id>/logs`), which serves each job's own
log, rerun attempts included; the capture files came from the run's artifact (`gh run download <run id>`). All fetched
on 16 November 2026 (UTC).

| File                                        | What                                                           | Commit                                     | Run         | Attempt | Job ID       | Source                                                     | SHA-256 (uncompressed)                                             | Bytes   |
| ------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------ | ----------- | ------- | ------------ | ---------------------------------------------------------- | ------------------------------------------------------------------ | ------- |
| `job-132958185393.log.gz`                   | `e2e (5/10)`, failed at the app web server's build             | `7c5845f92954b7b71657992839e33958b115c3c5` | 43761853978 | 1       | 132958185393 | job-log API                                                | `e16afe82cc28e4985551af836a81f00fe5831775c0b1e2bc5286b4ee762bd67d` | 69403   |
| `job-132980429213.log.gz`                   | `e2e (isolated)`, failed at "Header dropdowns"                 | `55d59c35f8576a4a68960401188522d0c6cd6f0c` | 43768997931 | 1       | 132980429213 | job-log API                                                | `7f8647a02945a57971fecf35c24737acd2bddecf8892cde40f6a0893680d4ca9` | 82393   |
| `job-132987480244.log.gz`                   | `e2e (isolated)`, failed at "Button styles" (rerun)            | `55d59c35f8576a4a68960401188522d0c6cd6f0c` | 43768997931 | 2       | 132987480244 | job-log API                                                | `94b17dec7e7120bffc4f60c26d01897defb8b15918f7c435bf05aa6ca4e5f196` | 107000  |
| `job-133031068347.log.gz`                   | `e2e (isolated)`, failed at "Design settings" (POST), diag off | `eb3fcbb59311d1da82a41257a32ebd3218f4baa4` | 43785167062 | 1       | 133031068347 | job-log API                                                | `4560ffc69c1f77352498448ef09df13ddf7947ad5947351fcd4fc20f3aec0351` | 87664   |
| `capture-43785202190/playwright.log.gz`     | the manual capture's whole Playwright output (`tee`d log)      | `eb3fcbb59311d1da82a41257a32ebd3218f4baa4` | 43785202190 | 1       | 133031176979 | artifact `e2e-lake-capture-43785202190-1` (id 14190244017) | `025df89e4ff4513635544b64451bdb111abb4a008ce4ac23bc5f3869cf084292` | 1876425 |
| `capture-43785202190/e2e-diag-lines.log.gz` | the `[e2e-diag]` lines picked out of that log                  | `eb3fcbb59311d1da82a41257a32ebd3218f4baa4` | 43785202190 | 1       | 133031176979 | the same artifact                                          | `0083befd4db124420de46cf86c14bbba65b993a342a810a5505ec1f9b2d5a0bb` | 1849159 |
| `capture-43785202190/commit.txt`            | requested and checked-out commit, run, attempt                 | `eb3fcbb59311d1da82a41257a32ebd3218f4baa4` | 43785202190 | 1       | 133031176979 | the same artifact                                          | `cdfcbcb39968ba2d4688ff5403de95699c803ce3b002812c1f15e4c158d6a818` | 167     |
| `capture-43785202190/exit-status.txt`       | each project's test exit status (all 0)                        | `eb3fcbb59311d1da82a41257a32ebd3218f4baa4` | 43785202190 | 1       | 133031176979 | the same artifact                                          | `cbc6b2dd0b10ddc8d432c6448b332ba9329ac69097ba98b2653dea5d7c1c8a4e` | 197     |
| `capture-43785202190/counts.txt`            | the capture's own counts (6343 lines, 0 client request errors) | `eb3fcbb59311d1da82a41257a32ebd3218f4baa4` | 43785202190 | 1       | 133031176979 | the same artifact                                          | `4b6147be455f50725b626a98cbb7f6ef710ec488556c56a13099a74588570062` | 113     |

Not kept: the capture's `playwright-report/` (an HTML report of passing tests). The artifact (digest
`sha256:064bbca49574a299d82a49b7b258a2bb8105b9810757e2d9cae8afaf6add47f7`) is on GitHub until 2026-12-16.

What the capture does and does not contain: the lake's records (859 connections, 2,142 requests) and 145 processes' `preload`
lines; **no client request, socket, response or error record**, because the client logger watched `node:http` and the site's reads
use undici's `fetch` (README section 3).
