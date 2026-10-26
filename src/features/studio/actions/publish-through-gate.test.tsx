import { renderToStaticMarkup } from 'react-dom/server'
import type { DocumentActionDescription, DocumentActionProps } from 'sanity'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SentToCurrawong } from './contributor-message'
import { PublishThroughGate, publishGateActions } from './publish-through-gate'

const state = vi.hoisted(() => ({ enabled: true, syncing: false }))

vi.mock('sanity', () => ({
  useClient: () => ({ config: () => ({}) }),
  useSyncState: () => ({ isSyncing: state.syncing }),
}))
vi.mock('@sanity/ui/toast', () => ({ useToast: () => ({ push: vi.fn() }) }))
vi.mock('@/config/env', () => ({ apiVersion: '2026-10-01', projectId: 'p1' }))
vi.mock('@/config/profile', () => ({ isFeatureEnabled: () => state.enabled }))

const DRAFT = { _id: 'drafts.about', _type: 'page' } as never
const Publish = Object.assign(() => ({ label: 'Publish' }), { action: 'publish' as const })
const Discard = Object.assign(() => ({ label: 'Discard' }), { action: 'discardChanges' as const })
const user = (role: string) => ({ currentUser: { roles: [{ name: role }] } }) as never

function describeAction(props: Partial<DocumentActionProps>) {
  let result: DocumentActionDescription | null | undefined
  function Probe() {
    result = PublishThroughGate({ id: 'about', type: 'page', ...props } as DocumentActionProps)
    return null
  }
  renderToStaticMarkup(<Probe />)
  return result
}

beforeEach(() => {
  state.enabled = true
  state.syncing = false
})

describe('publishGateActions', () => {
  it("swaps Publish for the gate's Publish for a contributor when the flag is on", () => {
    expect(publishGateActions([Publish, Discard], user('contributor'))).toEqual([
      PublishThroughGate,
      Discard,
    ])
  })

  it('keeps the "Sent to Currawong" message when the flag is off', () => {
    state.enabled = false
    expect(publishGateActions([Publish, Discard], user('contributor'))).toEqual([
      SentToCurrawong,
      Discard,
    ])
  })

  it("leaves agency staff and editors with Sanity's Publish, flag on or off", () => {
    for (const role of ['administrator', 'developer', 'editor']) {
      expect(publishGateActions([Publish, Discard], user(role))).toEqual([Publish, Discard])
    }
  })
})

describe('PublishThroughGate', () => {
  it('is a Publish button, enabled for a saved draft', () => {
    const result = describeAction({ draft: DRAFT })
    expect(result?.label).toBe('Publish')
    expect(result?.disabled).toBe(false)
  })

  it('is disabled with no draft, while saving, and inside a release', () => {
    const draft = DRAFT
    expect(describeAction({ draft: null })?.disabled).toBe(true)
    state.syncing = true
    expect(describeAction({ draft })?.disabled).toBe(true)
    state.syncing = false
    expect(describeAction({ draft, release: 'rAbc' })?.disabled).toBe(true)
  })
})
