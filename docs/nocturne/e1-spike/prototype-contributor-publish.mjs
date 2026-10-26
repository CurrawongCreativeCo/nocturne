/* eslint-disable -- throwaway E1 spike script, not part of the template */
import fs from 'node:fs'
import os from 'node:os'
const admin = JSON.parse(
  fs.readFileSync(os.homedir() + '/.config/sanity/config.json', 'utf8'),
).authToken
const P = 'r4kwvgkz',
  DS = 'studio-perf',
  V = 'v2025-02-19'
const log = (k, v) => console.log(k.padEnd(44), typeof v === 'string' ? v : JSON.stringify(v))
const call = async (tok, m, u, b) => {
  const r = await fetch(u, {
    method: m,
    headers: {
      Authorization: 'Bearer ' + tok,
      ...(b ? { 'content-type': 'application/json' } : {}),
    },
    body: b ? JSON.stringify(b) : undefined,
  })
  const t = await r.text()
  let j
  try {
    j = JSON.parse(t)
  } catch {
    j = t
  }
  return { s: r.status, j, t }
}
const mgmt = (m, p, b) => call(admin, m, 'https://api.sanity.io/v2021-06-07' + p, b)
const api = `https://${P}.api.sanity.io/${V}`
const mutate = (t, muts) =>
  call(t, 'POST', `${api}/data/mutate/${DS}?returnIds=true`, { mutations: muts })
const act = (t, a) => call(t, 'POST', `${api}/data/actions/${DS}`, { actions: a })
const tokens = []
const mk = async (l, r) => {
  const x = await mgmt('POST', `/projects/${P}/tokens`, { label: l, roleName: r })
  tokens.push(x.j.id)
  return x.j.key
}

// ---- Prototype: contributor publish (runs server-side with robots) ----
const PROTECTED = new Set(['designTone', 'layout']) // stand-in for the CLIENT_EDITABLE allowlist inverse
const OK_ROLES = new Set(['contributor', 'editor', 'administrator', 'developer'])
async function contributorPublish({ publisher, reader, access, id }) {
  const doc = async (i) =>
    (await call(publisher, 'GET', `${api}/data/doc/${DS}/${i}`)).j?.documents?.[0]
  const draft = await doc('drafts.' + id),
    pub = await doc(id)
  if (!draft) return { ok: false, why: 'no draft' }
  // 1 authors of every transaction since the last publish
  const h = await call(
    reader,
    'GET',
    `${api}/data/history/${DS}/transactions/drafts.${id}?excludeContent=true&limit=200`,
  )
  const txs = h.t
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l))
  const since = txs.filter((t) => !pub || t.timestamp > pub._updatedAt)
  const authors = [...new Set(since.map((t) => t.author))]
  // 2 current roles from the Access API
  const us = (
    await call(access, 'GET', `https://api.sanity.io/v2025-07-11/access/project/${P}/users`)
  ).j.data
  const byId = new Map(
    us.flatMap((u) =>
      u.memberships.filter((m) => m.resourceType === 'project').map((m) => [m.resourceUserId, u]),
    ),
  )
  const roles = {}
  for (const a of authors) {
    const m = byId.get(a)
    roles[a] = m
      ? m.memberships.find((x) => x.resourceType === 'project').roleNames
      : 'NOT A MEMBER'
    if (!m)
      return {
        ok: false,
        why: 'author not a current member (robot or removed): ' + a,
        authors,
        roles,
      }
  }
  for (const a of authors)
    if (!roles[a].some((r) => OK_ROLES.has(r)))
      return { ok: false, why: 'author role not allowed: ' + a, authors, roles }
  // 3 protected-field diff
  for (const k of PROTECTED)
    if (JSON.stringify(draft[k]) !== JSON.stringify(pub?.[k]))
      return { ok: false, why: 'protected field changed: ' + k, authors, roles }
  // 4 publish exactly the validated revision
  const r = await act(publisher, [
    {
      actionType: 'sanity.action.document.publish',
      draftId: 'drafts.' + id,
      publishedId: id,
      ifDraftRevisionId: draft._rev,
      ...(pub ? { ifPublishedRevisionId: pub._rev } : {}),
    },
  ])
  return { ok: r.s === 200, status: r.s, authors, roles }
}
try {
  const C = await mk('e1-contributor', 'contributor'),
    E = await mk('e1-editor', 'editor'),
    A = await mk('e1-access-manager', 'access-manager')
  // shape of Access API
  const us = (await call(A, 'GET', `https://api.sanity.io/v2025-07-11/access/project/${P}/users`)).j
  log('access top-level keys', Object.keys(us))
  const u0 = us.data[0]
  log('user keys', Object.keys(u0))
  log('membership sample', JSON.stringify(u0.memberships || u0.roles).slice(0, 400))
  log('totalCount/nextCursor', [us.totalCount, us.nextCursor])
  log(
    'resourceUserId/roles',
    us.data.map((u) => [
      u.memberships.map((m) => m.resourceUserId),
      u.memberships.map((m) => m.roleNames),
    ]),
  )
  for (const [n, t] of [
    ['editor', E],
    ['contributor', C],
  ]) {
    const r = await call(t, 'GET', `https://api.sanity.io/v2025-07-11/access/project/${P}/users`)
    log(
      `access users as ${n}`,
      r.s + ' n=' + r.j?.data?.length + ' roles visible=' + !!r.j?.data?.[0]?.memberships,
    )
  }
  // seed: admin (human) writes a draft
  await mutate(admin, [
    { createOrReplace: { _id: 'e1-doc', _type: 'page', title: 'v1', layout: 'a' } },
  ])
  await mutate(admin, [
    {
      createOrReplace: {
        _id: 'drafts.e1-doc',
        _type: 'page',
        title: 'v1 edit by human',
        layout: 'a',
      },
    },
  ])
  const h = await call(
    E,
    'GET',
    `${api}/data/history/${DS}/transactions/drafts.e1-doc?excludeContent=true`,
  )
  log(
    'history human author',
    h.t
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l).author),
  )
  log(
    '1 human author, no protected change',
    await contributorPublish({ publisher: E, reader: C, access: A, id: 'e1-doc' }),
  )
  // robot (contributor) author -> refused as not a member
  await mutate(C, [
    { createOrReplace: { _id: 'drafts.e1-doc', _type: 'page', title: 'robot edit', layout: 'a' } },
  ]).then((r) => log('contributor createOrReplace draft', r.s))
  log(
    '2 robot/non-member author',
    await contributorPublish({ publisher: E, reader: C, access: A, id: 'e1-doc' }),
  )
  await mutate(admin, [
    {
      createOrReplace: {
        _id: 'drafts.e1-doc',
        _type: 'page',
        title: 'human again',
        layout: 'CHANGED',
      },
    },
  ])
  log(
    '3 protected field changed',
    await contributorPublish({ publisher: E, reader: C, access: A, id: 'e1-doc' }),
  )
} finally {
  for (const id of tokens) {
    for (let i = 0; i < 4; i++) {
      try {
        const r = await mgmt('DELETE', `/projects/${P}/tokens/${id}`)
        log('delete token', r.s)
        break
      } catch {
        await new Promise((r) => setTimeout(r, 2000))
      }
    }
  }
  const ids =
    (
      await call(
        admin,
        'GET',
        `${api}/data/query/${DS}?query=` +
          encodeURIComponent('*[_id match "*e1-*" || _id match "versions.e1*"]._id'),
      )
    ).j?.result || []
  if (ids.length)
    log(
      'cleanup',
      (
        await mutate(
          admin,
          ids.map((id) => ({ delete: { id } })),
        )
      ).s,
    )
  log(
    'left behind',
    (
      await call(
        admin,
        'GET',
        `${api}/data/query/${DS}?query=` + encodeURIComponent('count(*[_id match "*e1-*"])'),
      )
    ).j?.result,
  )
}
