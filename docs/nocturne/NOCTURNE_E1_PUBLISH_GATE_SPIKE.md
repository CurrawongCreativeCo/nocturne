# E1 (task 190): publish gate security spike: findings

**Run:** 26 October 2026, on the throwaway project `r4kwvgkz` (Nocturne Studio performance, Growth trial), in its `studio-perf` dataset with `e1-` prefixed documents. No client project and no real data were touched. All probe documents and robot tokens were deleted afterwards (the second run confirmed zero `e1-` documents left).
**Scripts and raw output:** `docs/nocturne/e1-spike/`. Re-running them creates and deletes robot tokens, so do it only on a scratch project.

## Verdict

| Task                         | Verdict                                       |
| ---------------------------- | --------------------------------------------- |
| **196** publish gate: server | **GO**, with the changes under _Requirements_ |
| **214** publish gate: Studio | **GO**, once 196 exists                       |

The gate's core assumptions hold. Contributors cannot publish or touch published documents, the Actions API guards reject stale revisions, history reports author IDs, and a robot can read members' current roles. Four gaps need handling in the build (see _Gaps_).

## Findings

### 1. Contributor robot (`contributor` role)

| Probe                                                                                           | Result                 |
| ----------------------------------------------------------------------------------------------- | ---------------------- |
| Create / patch / delete a `drafts.*` document (including drafts the Contributor did not create) | **Allowed**            |
| Create a non-draft document (`create`, `createIfNotExists`)                                     | Denied (403, `create`) |
| `createOrReplace` / `patch` a published document                                                | Denied (403, `update`) |
| Delete a published document                                                                     | Denied                 |
| `sanity.action.document.publish` / `unpublish`                                                  | **Denied**             |
| `sanity.action.release.create` / `release.publish`                                              | Denied                 |
| `sanity.action.document.discard` (a draft)                                                      | Allowed                |
| **Create `versions.<release>.<id>` documents** (mutate, and `document.version.create`)          | **Allowed**            |
| **Upload image and file assets**                                                                | **Allowed**            |
| **Create `sanity.imageAsset` documents directly** (forged id)                                   | **Allowed**            |
| Delete asset documents                                                                          | Denied (orphans stay)  |
| Query                                                                                           | Allowed                |

### 2. Editor robot: Actions API guards

- `publish` with `ifDraftRevisionId` / `ifPublishedRevisionId` works. A wrong value of either returns **409**, naming the actual revision.
- A Contributor edit made **after** validation but before publish changes the draft revision, so publishing the validated revision returns **409** and nothing goes live. This is the race the gate needs closed, and it is closed.
- Publishing with both current revisions returns 200 and the draft goes live.

### 3. History API

Transactions report an **`author`** on each entry (`excludeContent=true` is enough). The ID is project-scoped (`pbSwUC7fg` for a person, `p-…` for a robot token). Both the Editor and Contributor robots can read it. An Access Manager robot cannot (403), so it is not needed or useful here.

### 4. Access API

`GET https://api.sanity.io/v2025-07-11/access/project/<id>/users` works with **any** robot, including a Contributor, and returns every member's `memberships[].roleNames`. Match a history author to a member on **`memberships[].resourceUserId`** (not `profile.id`). It lists people only: **robot authors are not members**, which makes them easy to refuse.

### 5. Prototype Contributor Publish (`prototype-contributor-publish.mjs`)

An Editor-robot routine: read draft and published revisions, list authors since the last publish from history, look up each author's current role, check protected fields, then publish with both revision guards. Results:

| Case                                  | Result                                                                                                                |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| One human author with an allowed role | Published                                                                                                             |
| A robot author in the history         | **Refused** (not a current member)                                                                                    |
| A removed member                      | Same path as a robot (not found): refused                                                                             |
| Protected field changed               | The check exists, but the run reached a robot author first, so it was **not isolated**. Test it as a unit test in 196 |

**Not tested:** a person suspended to Viewer, or a real Contributor user. Both need a second human member, which would change the project's members. The role check handles them by design (Viewer is not in the allowed set), but 196's tests must cover it with a faked Access response.

## Gaps (the build must handle these)

1. **Contributors can create release versions** (`versions.*`), even though they can't create releases. A later agency release publish would publish them. Release publishing stays agency-only, and the 206 review must list `versions.*` documents authored by Contributors.
2. **Contributors can upload assets and forge asset documents.** They can't delete them. Treat asset documents as untrusted: the gate must not publish a document that references an asset it didn't validate, and the agency clears orphans periodically.
3. **Contributors can edit anyone's draft**, not only their own. The authors check (history plus Access API) is therefore required, not optional.
4. **Contributors can discard drafts.** Not a security issue, but a Contributor can wipe a colleague's unpublished work. Mention it in the editor guide.

## Requirements for 196 and 214

**Robot (one only): `Editor`.** It reads documents, reads history, reads the Access API and publishes. Do **not** use an Administrator or Developer token. A Contributor token is not needed on the server. Token goes in a server-only env var with a config registry entry (task 227), never `NEXT_PUBLIC_`.

**Server (196):**

- Authorise the caller, then compute authors from history **since the published document's last update**, and refuse if any author is not a current member with `contributor`, `editor` or `administrator` (deny by default; unknown, robot, removed and Viewer are all refused).
- Page the Access API (`nextCursor`), since the first page may not be all members.
- Refuse changes to protected fields (the 205 `CLIENT_EDITABLE` allowlist), and send deletes, unpublishes and new documents to review.
- Publish only with both `ifDraftRevisionId` and `ifPublishedRevisionId`; on 409, tell the editor to review the latest changes and try again.
- Rate-limit and audit-log each attempt.

**Studio (214):** the action calls the route, shows the 409 message as "Someone changed this while you were publishing", and never offers the normal Publish to client users.

## Cost and state

No spend: the Growth trial covers the Contributor role. A second dataset needed a paid plan (HTTP 402), so the probes used the existing `studio-perf` dataset. The `studio-perf-write` and `studio-perf-read` tokens are unchanged.
