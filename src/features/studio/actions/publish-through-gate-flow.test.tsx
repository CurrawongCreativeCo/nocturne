// @vitest-environment jsdom
/**
 * What a Contributor sees from pressing Publish to the last message, in a DOM: the action's button
 * state, the "Checking your changes…" wait, and each way the gate can answer. The gate itself is
 * tested against a fake Sanity in src/app/publish-gate-route.test.ts; Studio cannot sign in against
 * the fake Content Lake, so the action is rendered here with Studio's hooks stubbed.
 */
import { ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { DocumentActionDescription, DocumentActionProps } from 'sanity'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PublishThroughGate } from './publish-through-gate'

const hooks = vi.hoisted(() => ({
  token: 'jo-token',
  syncing: false,
  toasts: [] as { status: string; title: string }[],
}))

vi.mock('sanity', () => ({
  useClient: () => ({ config: () => ({ token: hooks.token }) }),
  useSyncState: () => ({ isSyncing: hooks.syncing }),
}))
vi.mock('@sanity/ui/toast', () => ({
  useToast: () => ({
    push: (toast: { status: string; title: string }) => hooks.toasts.push(toast),
  }),
}))
vi.mock('@/config/env', () => ({ apiVersion: '2026-10-01', projectId: 'p1' }))
vi.mock('@/config/profile', () => ({ isFeatureEnabled: () => true }))

/** Renders the action the way Studio's actions box does: a button, and its dialog when open. */
function Host({ props }: { props: Partial<DocumentActionProps> }) {
  const action = PublishThroughGate({
    id: 'about',
    type: 'page',
    draft: { _id: 'drafts.about', _type: 'page' },
    ...props,
  } as DocumentActionProps) as DocumentActionDescription & {
    onHandle?: () => void
    disabled?: boolean
    dialog?:
      | false
      | {
          header?: string
          content?: React.ReactNode
          footer?: React.ReactNode
          onClose: () => void
        }
  }
  return (
    <ThemeProvider theme={buildTheme()}>
      <button
        type="button"
        disabled={action.disabled}
        title={typeof action.title === 'string' ? action.title : undefined}
        onClick={action.onHandle}
      >
        {action.label}
      </button>
      {action.dialog && (
        <section role="dialog" aria-label={action.dialog.header}>
          <h2>{action.dialog.header}</h2>
          {action.dialog.content}
          {action.dialog.footer}
        </section>
      )}
    </ThemeProvider>
  )
}

const reply = (status: number, body: unknown) => () =>
  Promise.resolve(Response.json(body, { status }))
const answerWith = (impl: (...args: unknown[]) => Promise<Response>) =>
  vi.stubGlobal('fetch', vi.fn(impl))

const press = (props: Partial<DocumentActionProps> = {}) => {
  render(<Host props={props} />)
  fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
}

beforeEach(() => {
  hooks.token = 'jo-token'
  hooks.syncing = false
  hooks.toasts = []
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('the Publish button', () => {
  it('is enabled for a saved draft and disabled with nothing to publish, while saving, or in a release', () => {
    render(<Host props={{}} />)
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Publish' }).disabled).toBe(false)
    cleanup()
    render(<Host props={{ draft: null }} />)
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Publish' }).disabled).toBe(true)
    cleanup()
    hooks.syncing = true
    render(<Host props={{}} />)
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Publish' }).disabled).toBe(true)
    cleanup()
    hooks.syncing = false
    render(<Host props={{ release: 'rAbc' }} />)
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Publish' }).disabled).toBe(true)
  })
})

describe('pressing Publish', () => {
  it("shows a wait, then a success toast, and sends only the id and the person's own token", async () => {
    let finish: (response: Response) => void = () => undefined
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => (finish = resolve)))
    vi.stubGlobal('fetch', fetchMock)
    press()
    await screen.findByRole('dialog', { name: 'Publishing…' })
    expect(screen.getByRole('status').textContent).toContain('Checking your changes…')
    finish(Response.json({ status: 'published' }, { status: 200 }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
    expect(hooks.toasts).toEqual([{ status: 'success', title: 'Your changes are live.' }])
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/\/api\/publish$/)
    expect(init.body).toBe('{"documentId":"about"}')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jo-token')
  })

  it('names the fields that need Currawong when a change goes to review', async () => {
    answerWith(
      reply(202, {
        status: 'review',
        reasons: [
          { kind: 'protected-field', message: 'x', path: ['pageBuilder', 'hero', 'imageShape'] },
        ],
      }),
    )
    press()
    const dialog = await screen.findByRole('dialog', { name: 'Sent to Currawong for review' })
    expect(dialog.textContent).toContain('pageBuilder › hero › imageShape')
    expect(dialog.textContent).toContain('Waiting for review')
    expect(hooks.toasts).toEqual([])
  })

  it('lists what to fix, without claiming the change was sent to review', async () => {
    answerWith(reply(422, { status: 'invalid', problems: [{ message: 'title needs a value.' }] }))
    press()
    const dialog = await screen.findByRole('dialog', { name: 'Fix these before publishing' })
    expect(dialog.textContent).toContain('title needs a value.')
    expect(dialog.textContent).not.toContain('Sent to Currawong')
  })

  it('tells the person someone changed the draft meanwhile', async () => {
    answerWith(reply(409, { status: 'conflict' }))
    press()
    expect((await screen.findByRole('dialog')).textContent).toContain(
      'Someone changed this while you were publishing. Review the latest changes and try again.',
    )
  })

  it('says "Sent to Currawong for review" only when the gate really sent the change to review', async () => {
    for (const [status, body, title] of [
      [429, { message: 'Slow down.' }, 'Too many tries'],
      [401, {}, 'Sign in again'],
      [403, { message: 'Your role cannot publish through this route.' }, 'Not published'],
      [404, {}, 'Not published'],
      [502, {}, 'Not published'],
    ] as const) {
      answerWith(reply(status, body))
      press()
      const dialog = await screen.findByRole('dialog', { name: title })
      expect(dialog.textContent).not.toContain('Sent to Currawong for review')
      cleanup()
    }
  })

  it('explains a network failure, and nothing is reported as published', async () => {
    answerWith(() => Promise.reject(new TypeError('Failed to fetch')))
    press()
    const dialog = await screen.findByRole('dialog', { name: 'Not published' })
    expect(dialog.textContent).toContain('nothing was published')
    expect(hooks.toasts).toEqual([])
  })

  it('asks for a new sign-in, without calling the route, when Studio has no token', async () => {
    hooks.token = ''
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    press()
    await screen.findByRole('dialog', { name: 'Sign in again' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('closes with "Got it", and closing mid-request shows nothing later', async () => {
    let finish: (response: Response) => void = () => undefined
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>((resolve) => (finish = resolve))),
    )
    press()
    await screen.findByRole('dialog', { name: 'Publishing…' })
    finish(Response.json({ status: 'review', reasons: [] }, { status: 202 }))
    fireEvent.click(await screen.findByRole('button', { name: 'Got it' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
