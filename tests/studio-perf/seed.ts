import { apiUrl, assertTarget, DATASET } from './safety.ts'
import { seedDocuments } from './seed-data.ts'

const project = assertTarget()
const token = process.env.STUDIO_PERF_WRITE_TOKEN
if (!token) throw new Error('Set STUDIO_PERF_WRITE_TOKEN for the throwaway dataset only.')

async function request(
  path: string,
  body: string,
  contentType = 'application/json',
): Promise<unknown> {
  // Re-check immediately before every write. No API host or dataset override is accepted.
  assertTarget()
  const response = await fetch(apiUrl(project, path), {
    method: 'POST',
    signal: AbortSignal.timeout(60_000),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': contentType },
    body,
  })
  if (!response.ok)
    throw new Error(`Throwaway seed failed (${response.status}); response body withheld.`)
  return response.json()
}

const result = (await request(
  `assets/images/${DATASET}?filename=studio-perf.svg`,
  '<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1600"><rect width="2400" height="1600" fill="#234940"/></svg>',
  'image/svg+xml',
)) as { document: { _id: string } }
const docs = seedDocuments(result.document._id)
await request(
  `data/mutate/${DATASET}`,
  JSON.stringify({ mutations: docs.map((doc) => ({ createIfNotExists: doc })) }),
)
console.log(
  `Seeded ${docs.length} fixture documents in the throwaway dataset. Existing documents were retained.`,
)
