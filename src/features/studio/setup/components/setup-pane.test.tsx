// @vitest-environment jsdom
/**
 * What the Features & setup pane shows as the signed-in person changes, in a DOM: agency details
 * appear only for a verified agency user, never reach a client, and disappear when the session
 * ends or someone else signs in. The route itself is tested over HTTP in
 * src/app/setup-status-route.test.ts; Studio can't sign in against the fake Content Lake, so the
 * pane is rendered here with Studio's hooks stubbed.
 */
import { ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { FeatureConfig } from '@/config/feature-config'

import { SetupPane } from './setup-pane'

const hooks = vi.hoisted(() => ({
  token: undefined as string | undefined,
  roles: ['administrator'],
}))

vi.mock('sanity', () => ({
  useClient: () => ({ config: () => ({ token: hooks.token }) }),
  useCurrentUser: () => ({ roles: hooks.roles.map((name) => ({ name })) }),
}))
vi.mock('@/config/env', () => ({
  apiVersion: '2026-10-01',
  projectId: 'p1',
  studioUrl: '/studio',
}))

const features: FeatureConfig[] = [
  {
    id: 'forms',
    title: 'Contact forms',
    summary: 'Sends enquiries by email.',
    why: 'Visitors can reach you.',
    withoutIt: 'No form works.',
    profileFlag: null,
    tier: 'core',
    since: '1.0.0',
    docs: 'README.md#forms',
    settings: [{ name: 'TURNSTILE_SECRET_KEY', kind: 'secret', where: 'vercel', required: true }],
    verify: [],
  },
]

const STATUS = {
  schema: 1,
  environment: { kind: 'production', label: 'Vercel Production' },
  features: [
    {
      id: 'forms',
      title: 'Contact forms',
      tier: 'core',
      status: 'not-set-up',
      reason: 'Not set up: TURNSTILE_SECRET_KEY not set',
      withoutIt: '',
      missing: ['TURNSTILE_SECRET_KEY'],
      unchecked: [],
      invalid: [],
      planned: [],
      warnings: [],
    },
  ],
  pending: [],
  templateVersion: '1.8.0',
  tier: 'standard',
  enabled: {},
  commit: 'abc1234def5678',
  builtAt: '2026-10-26T09:14:00+11:00',
}

const theme = buildTheme()
const pane = () => (
  <ThemeProvider theme={theme}>
    <SetupPane options={{ features }} />
  </ThemeProvider>
)

/** Answers by token, like the route: a map of token to status code. */
function stubRoute(answers: Record<string, number>) {
  const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
    const header = (init?.headers as Record<string, string> | undefined)?.Authorization ?? ''
    const status = answers[header.replace('Bearer ', '')] ?? 401
    return Promise.resolve(new Response(JSON.stringify(status === 200 ? STATUS : {}), { status }))
  })
  vi.stubGlobal('fetch', fetchMock)
  window.fetch = fetchMock as never
  return fetchMock
}

beforeEach(() => {
  hooks.token = 'agency-token'
  hooks.roles = ['administrator']
  window.localStorage.clear()
  // Studio is embedded in the site, at the Studio path.
  window.history.pushState({}, '', '/studio/structure/websiteSettings;setup')
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const AGENCY_DETAILS = /Needs attention|This deployment|TURNSTILE_SECRET_KEY not set/

describe('SetupPane', () => {
  it('shows the status to a verified agency user', async () => {
    stubRoute({ 'agency-token': 200 })
    render(pane())
    expect(await screen.findByText(/This deployment: abc1234/)).toBeTruthy()
    expect(screen.getByText('Needs attention (1)')).toBeTruthy()
    expect(screen.getByText('Not set up: TURNSTILE_SECRET_KEY not set')).toBeTruthy()
  })

  it('shows a client nothing from the site, and never calls the route', async () => {
    hooks.roles = ['editor']
    const fetchMock = stubRoute({ 'agency-token': 200 })
    render(pane())
    expect(screen.getByText(/is for Currawong/)).toBeTruthy()
    expect(screen.queryByText('Contact forms')).toBeNull()
    expect(screen.queryByText(AGENCY_DETAILS)).toBeNull()
    await Promise.resolve()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([401, 403])(
    'shows explanations only, no status, when the route answers %i',
    async (code) => {
      stubRoute({ 'agency-token': code })
      render(pane())
      expect(await screen.findByText(/Check readiness with/)).toBeTruthy()
      expect(screen.getByText('Contact forms')).toBeTruthy()
      expect(screen.queryByText(AGENCY_DETAILS)).toBeNull()
      expect(screen.queryByText('Ready')).toBeNull()
    },
  )

  it('shows explanations only when Studio has no token (cookie sign-in), without asking', async () => {
    hooks.token = undefined
    const fetchMock = stubRoute({})
    render(pane())
    expect(await screen.findByText(/signed you in with a cookie/)).toBeTruthy()
    expect(screen.queryByText(AGENCY_DETAILS)).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends nothing when Studio is hosted away from the site', async () => {
    window.history.pushState({}, '', '/structure/websiteSettings;setup')
    const fetchMock = stubRoute({ 'agency-token': 200 })
    render(pane())
    expect(await screen.findByText(/isn't running inside the website/)).toBeTruthy()
    expect(screen.queryByText(AGENCY_DETAILS)).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('says what to change when an older sanity.config.ts gave it no feature list', () => {
    stubRoute({ 'agency-token': 200 })
    render(
      <ThemeProvider theme={theme}>
        <SetupPane options={{ features: [] }} />
      </ThemeProvider>,
    )
    expect(screen.getByText(/wasn't given the feature list/)).toBeTruthy()
  })

  it('says it could not load, with Try again, when the route fails', async () => {
    const fetchMock = stubRoute({ 'agency-token': 503 })
    render(pane())
    expect(await screen.findByText(/Couldn't load the setup status/)).toBeTruthy()
    expect(screen.queryByText(AGENCY_DETAILS)).toBeNull()
    stubRoute({ 'agency-token': 200 })
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText(/This deployment/)).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('clears the agency details when the session ends', async () => {
    stubRoute({ 'agency-token': 200 })
    const view = render(pane())
    expect(await screen.findByText(/This deployment/)).toBeTruthy()
    hooks.token = undefined
    view.rerender(pane())
    await waitFor(() => {
      expect(screen.queryByText(AGENCY_DETAILS)).toBeNull()
    })
    expect(await screen.findByText(/signed you in with a cookie/)).toBeTruthy()
  })

  it('never shows the last person’s details to the next person while theirs load', async () => {
    stubRoute({ 'agency-token': 200 })
    const view = render(pane())
    expect(await screen.findByText(/This deployment/)).toBeTruthy()

    // Someone else signs in; the route hasn't answered them yet.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => undefined)),
    )
    window.fetch = globalThis.fetch
    hooks.token = 'other-token'
    view.rerender(pane())
    expect(screen.queryByText(AGENCY_DETAILS)).toBeNull()
    expect(screen.getByRole('status')).toBeTruthy()
  })

  it('does not bring the details back for a person who stopped being agency staff', async () => {
    stubRoute({ 'agency-token': 200 })
    const view = render(pane())
    expect(await screen.findByText(/This deployment/)).toBeTruthy()
    hooks.roles = ['editor']
    view.rerender(pane())
    expect(screen.queryByText(AGENCY_DETAILS)).toBeNull()
    expect(screen.getByText(/is for Currawong/)).toBeTruthy()
    // Made agency again with the same token: it asks again rather than showing the old answer.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => undefined)),
    )
    window.fetch = globalThis.fetch
    hooks.roles = ['administrator']
    view.rerender(pane())
    expect(screen.queryByText(AGENCY_DETAILS)).toBeNull()
  })
})
