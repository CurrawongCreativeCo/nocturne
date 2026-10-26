/* eslint-disable -- throwaway E1 spike script, not part of the template */
import fs from 'node:fs'
import os from 'node:os'
const admin = JSON.parse(
  fs.readFileSync(os.homedir() + '/.config/sanity/config.json', 'utf8'),
).authToken
const P = 'r4kwvgkz',
  DS = 'studio-perf',
  V = 'v2025-02-19'
const out = []
const log = (k, v) => {
  out.push([k, v])
  console.log(k.padEnd(46), typeof v === 'string' ? v : JSON.stringify(v))
}
const call = async (tok, method, url, body, hdr = {}) => {
  const r = await fetch(url, {
    method,
    headers: {
      Authorization: 'Bearer ' + tok,
      ...(body && !(body instanceof Uint8Array) ? { 'content-type': 'application/json' } : {}),
      ...hdr,
    },
    body: body instanceof Uint8Array ? body : body ? JSON.stringify(body) : undefined,
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
const mutate = (tok, muts) =>
  call(tok, 'POST', `${api}/data/mutate/${DS}?returnIds=true&returnDocuments=false`, {
    mutations: muts,
  })
const act = (tok, actions) => call(tok, 'POST', `${api}/data/actions/${DS}`, { actions })
const brief = (r) =>
  `${r.s} ${typeof r.j === 'string' ? r.j.slice(0, 120) : JSON.stringify(r.j?.error?.description || r.j?.error || r.j?.results || r.j?.message || r.j).slice(0, 160)}`
const tokens = []
const mk = async (label, roleName) => {
  const r = await mgmt('POST', `/projects/${P}/tokens`, { label, roleName })
  if (r.s >= 300) {
    log('token ' + label, brief(r))
    return null
  }
  tokens.push(r.j.id)
  return r.j.key
}
try {
  const C = await mk('e1-contributor', 'contributor'),
    E = await mk('e1-editor', 'editor'),
    A = await mk('e1-access-manager', 'access-manager')
  // seed with admin
  const sd = await mutate(admin, [
    { createOrReplace: { _id: 'e1-page1', _type: 'page', title: 'Published v1' } },
    { createOrReplace: { _id: 'e1-page2', _type: 'page', title: 'Other published' } },
    { createOrReplace: { _id: 'drafts.e1-page2', _type: 'page', title: 'Other draft' } },
  ])
  log('seed', sd.s)
  // ---- 1 Contributor
  const c = (k, r) => log('C: ' + k, brief(r))
  c(
    'create drafts.* doc',
    await mutate(C, [{ create: { _id: 'drafts.e1-cdoc', _type: 'page', title: 'c draft' } }]),
  )
  c(
    'create NON-draft doc',
    await mutate(C, [{ create: { _id: 'e1-cpub', _type: 'page', title: 'c pub' } }]),
  )
  c(
    'createOrReplace published e1-page1',
    await mutate(C, [{ createOrReplace: { _id: 'e1-page1', _type: 'page', title: 'HACK' } }]),
  )
  c(
    'patch published e1-page1',
    await mutate(C, [{ patch: { id: 'e1-page1', set: { title: 'HACK2' } } }]),
  )
  c(
    'createIfNotExists non-draft',
    await mutate(C, [{ createIfNotExists: { _id: 'e1-cpub2', _type: 'page' } }]),
  )
  c(
    'patch own draft (drafts.e1-cdoc)',
    await mutate(C, [{ patch: { id: 'drafts.e1-cdoc', set: { title: 'edited' } } }]),
  )
  c(
    'patch OTHER draft (drafts.e1-page2)',
    await mutate(C, [{ patch: { id: 'drafts.e1-page2', set: { title: 'c edit' } } }]),
  )
  c('delete drafts.e1-cdoc', await mutate(C, [{ delete: { id: 'drafts.e1-cdoc' } }]))
  c('delete published e1-page2', await mutate(C, [{ delete: { id: 'e1-page2' } }]))
  c(
    'release create (action)',
    await act(C, [
      { actionType: 'sanity.action.release.create', releaseId: 'e1rc1', metadata: { title: 'c' } },
    ]),
  )
  c(
    'create versions.rx.doc (mutate)',
    await mutate(C, [{ create: { _id: 'versions.e1rx.e1-cv', _type: 'page' } }]),
  )
  c(
    'version.create action in release',
    await act(C, [
      {
        actionType: 'sanity.action.document.version.create',
        publishedId: 'e1-page1',
        document: { _id: 'versions.e1rx.e1-page1', _type: 'page', title: 'v' },
      },
    ]),
  )
  c(
    'publish action (draft e1-page2)',
    await act(C, [
      {
        actionType: 'sanity.action.document.publish',
        draftId: 'drafts.e1-page2',
        publishedId: 'e1-page2',
      },
    ]),
  )
  c(
    'unpublish action',
    await act(C, [
      {
        actionType: 'sanity.action.document.unpublish',
        draftId: 'drafts.e1-page1',
        publishedId: 'e1-page1',
      },
    ]),
  )
  c(
    'discard action',
    await act(C, [{ actionType: 'sanity.action.document.discard', draftId: 'drafts.e1-page2' }]),
  )
  c(
    'release publish action',
    await act(C, [{ actionType: 'sanity.action.release.publish', releaseId: 'e1rx' }]),
  )
  const png = Uint8Array.from(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64',
    ),
  )
  const up = await call(C, 'POST', `${api}/assets/images/${DS}?filename=e1.png`, png, {
    'content-type': 'image/png',
  })
  c('asset image upload', up)
  const upf = await call(
    C,
    'POST',
    `${api}/assets/files/${DS}?filename=e1.txt`,
    new TextEncoder().encode('hi'),
    { 'content-type': 'text/plain' },
  )
  c('asset file upload', upf)
  const aid = up.j?.document?._id
  if (aid) c('delete uploaded asset doc', await mutate(C, [{ delete: { id: aid } }]))
  c(
    'create asset doc directly (sanity.imageAsset)',
    await mutate(C, [
      {
        create: {
          _id: 'image-e1fakeasset0000000000000000000000000-1x1-png',
          _type: 'sanity.imageAsset',
        },
      },
    ]),
  )
  c('query published', await call(C, 'GET', `${api}/data/query/${DS}?query=count(*)`))
  // ---- 2 Editor publish + guards
  const e = (k, r) => log('E: ' + k, brief(r))
  await mutate(E, [
    { createOrReplace: { _id: 'drafts.e1-page1', _type: 'page', title: 'Draft A' } },
  ])
  const q = async (id) =>
    (await call(E, 'GET', `${api}/data/doc/${DS}/${id}`)).j?.documents?.[0]?._rev
  const dr1 = await q('drafts.e1-page1'),
    pr1 = await q('e1-page1')
  log('revs', { dr1, pr1 })
  e(
    'publish stale ifDraftRevisionId',
    await act(E, [
      {
        actionType: 'sanity.action.document.publish',
        draftId: 'drafts.e1-page1',
        publishedId: 'e1-page1',
        ifDraftRevisionId: 'stale-rev',
        ifPublishedRevisionId: pr1,
      },
    ]),
  )
  e(
    'publish stale ifPublishedRevisionId',
    await act(E, [
      {
        actionType: 'sanity.action.document.publish',
        draftId: 'drafts.e1-page1',
        publishedId: 'e1-page1',
        ifDraftRevisionId: dr1,
        ifPublishedRevisionId: 'stale-rev',
      },
    ]),
  )
  await mutate(C, [
    { patch: { id: 'drafts.e1-page1', set: { title: 'Contributor sneaked edit' } } },
  ]) // draft moves after validation
  e(
    'publish validated rev after draft moved',
    await act(E, [
      {
        actionType: 'sanity.action.document.publish',
        draftId: 'drafts.e1-page1',
        publishedId: 'e1-page1',
        ifDraftRevisionId: dr1,
        ifPublishedRevisionId: pr1,
      },
    ]),
  )
  const dr2 = await q('drafts.e1-page1')
  const pr2 = await q('e1-page1')
  e(
    'publish with correct guards',
    await act(E, [
      {
        actionType: 'sanity.action.document.publish',
        draftId: 'drafts.e1-page1',
        publishedId: 'e1-page1',
        ifDraftRevisionId: dr2,
        ifPublishedRevisionId: pr2,
      },
    ]),
  )
  log(
    'published title now',
    (await call(E, 'GET', `${api}/data/doc/${DS}/e1-page1`)).j?.documents?.[0]?.title,
  )
  // ---- 3 History
  for (const [n, tok] of [
    ['editor', E],
    ['contributor', C],
    ['access-manager', A],
  ]) {
    const h = await call(
      tok,
      'GET',
      `${api}/data/history/${DS}/transactions/drafts.e1-page1?excludeContent=true&limit=10`,
    )
    const lines =
      typeof h.j === 'string'
        ? h.t
            .trim()
            .split('\n')
            .map((l) => {
              try {
                return JSON.parse(l)
              } catch {
                return null
              }
            })
            .filter(Boolean)
        : []
    log(
      `History(${n})`,
      h.s +
        ' ' +
        JSON.stringify(
          lines.slice(0, 5).map((l) => ({
            id: l.id?.slice(0, 8),
            author: l.author,
            t: l.timestamp?.slice(11, 19),
          })),
        ).slice(0, 300),
    )
    if (!lines.length) log(`History(${n}) raw`, h.t.slice(0, 200))
  }
  // ---- Access API: members' roles
  for (const [n, tok] of [
    ['editor', E],
    ['contributor', C],
    ['access-manager', A],
  ]) {
    const p1 = await call(tok, 'GET', `https://api.sanity.io/v2021-06-07/projects/${P}`)
    log(
      `Access project(${n})`,
      p1.s +
        ' ' +
        (Array.isArray(p1.j?.members)
          ? `members:${p1.j.members.length} roles:${JSON.stringify(p1.j.members[0]?.roles?.map((r) => r.name))}`
          : brief(p1)),
    )
    const p2 = await call(tok, 'GET', `https://api.sanity.io/v2025-07-11/access/project/${P}/users`)
    log(
      `Access /access users(${n})`,
      p2.s +
        ' ' +
        (Array.isArray(p2.j) ? `n=${p2.j.length} keys:${Object.keys(p2.j[0] || {})}` : brief(p2)),
    )
    const p3 = await call(
      tok,
      'GET',
      `https://api.sanity.io/v2025-07-11/access/project/${P}/users/me`,
    )
    log(`Access users/me(${n})`, brief(p3))
    const p4 = await call(tok, 'GET', `https://api.sanity.io/v2021-06-07/projects/${P}/users`)
    log(`projects/users(${n})`, brief(p4))
  }
} finally {
  for (const id of tokens) {
    for (let i = 0; i < 4; i++) {
      try {
        const r = await mgmt('DELETE', `/projects/${P}/tokens/${id}`)
        log('delete token', r.s)
        break
      } catch (e) {
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
          encodeURIComponent(
            '*[_id match "*e1-*" || _id match "drafts.e1-*" || _id match "versions.e1*" || originalFilename match "e1.*"]._id',
          ),
      )
    ).j?.result || []
  log('cleanup docs', ids)
  if (ids.length) {
    const r = await mutate(
      admin,
      ids.map((id) => ({ delete: { id } })),
    )
    log('cleanup delete', r.s)
  }
}
