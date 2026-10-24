import type { SanityClient } from '@sanity/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clearPreviewSecrets, getPreviewSecret } from './preview-secret'

/** Records what createPreviewSecret writes, as far as the package's own code touches the client. */
function fakeClient() {
  const written: { transaction: Record<string, unknown>[]; commit: unknown[]; patch: unknown[] } = {
    transaction: [],
    commit: [],
    patch: [],
  }
  const client = {
    config: () => ({ projectId: 'p', dataset: 'd' }),
    withConfig: () => client,
    patch: (id: string) => ({
      set: (fields: Record<string, unknown>) => {
        written.patch.push({ id, fields })
        return { id, fields }
      },
    }),
    transaction: () => {
      const tx = {
        createOrReplace: (doc: Record<string, unknown>) => {
          written.transaction.push(doc)
          return tx
        },
        patch: () => tx,
        commit: (options: unknown) => {
          written.commit.push(options)
          return Promise.resolve()
        },
      }
      return tx
    },
    delete: vi.fn(() => Promise.resolve()),
  }
  return { client: client as unknown as SanityClient, written }
}

describe('getPreviewSecret', () => {
  beforeEach(() => {
    clearPreviewSecrets()
  })

  it('writes the same secret document Presentation does', async () => {
    const { client, written } = fakeClient()
    const secret = await getPreviewSecret(client, 'https://site.test/studio', 'user1')
    expect(secret).toMatch(/\S{20,}/)
    expect(written.transaction).toHaveLength(1)
    expect(written.transaction[0]).toMatchObject({ _type: 'sanity.previewUrlSecret' })
    expect(String(written.transaction[0]?._id)).toMatch(/^drafts\./)
    expect(written.commit).toEqual([{ tag: 'sanity.preview-url-secret' }])
    expect(written.patch[0]).toMatchObject({
      fields: { source: 'nocturne/structure-preview', studioUrl: 'https://site.test/studio' },
    })
  })

  it('reuses a secret until it is nearly out of date', async () => {
    const { client, written } = fakeClient()
    const first = await getPreviewSecret(client, 'u', 'user1')
    expect(await getPreviewSecret(client, 'u', 'user1')).toBe(first)
    expect(written.transaction).toHaveLength(1)
    const later = Date.now() + 56 * 60 * 1000
    expect(await getPreviewSecret(client, 'u', 'user1', { now: later })).not.toBe(first)
    expect(written.transaction).toHaveLength(2)
  })

  it('makes a new one when asked for a fresh one', async () => {
    const { client, written } = fakeClient()
    await getPreviewSecret(client, 'u', 'user1')
    await getPreviewSecret(client, 'u', 'user1', { fresh: true })
    expect(written.transaction).toHaveLength(2)
  })

  it('does not remember a failure', async () => {
    const { client } = fakeClient()
    const failing = {
      config: () => ({ projectId: 'p', dataset: 'd' }),
      patch: client.patch.bind(client),
      transaction: () => {
        throw new Error('offline')
      },
      withConfig: () => failing,
      delete: () => Promise.resolve(),
    } as unknown as SanityClient
    await expect(getPreviewSecret(failing, 'u', 'user1')).rejects.toThrow('offline')
    await expect(getPreviewSecret(client, 'u', 'user1')).resolves.toBeTruthy()
  })
})
