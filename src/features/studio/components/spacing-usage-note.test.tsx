import { ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { LISTED_LIMIT, SpacingUsageView, type SpacingUsageState } from './spacing-usage-note'

vi.mock('@/config/env', () => ({ apiVersion: '2025-01-01' }))
vi.mock('sanity', () => ({ useClient: () => ({}) }))
vi.mock('sanity/router', () => ({
  IntentLink: ({
    intent,
    params,
    children,
  }: {
    intent: string
    params: { id: string; type: string; path: string }
    children: ReactNode
  }) => (
    <button
      type="button"
      data-intent={intent}
      data-id={params.id}
      data-type={params.type}
      data-path={params.path}
    >
      {children}
    </button>
  ),
}))

const render = (state: SpacingUsageState) =>
  renderToStaticMarkup(
    <ThemeProvider theme={buildTheme()}>
      <SpacingUsageView state={state} />
    </ThemeProvider>,
  )

const document = (count: number) => ({
  id: 'home',
  type: 'page' as const,
  title: 'Home',
  sections: Array.from({ length: count }, (_, index) => ({
    key: `k${index}`,
    label: `Section ${index}`,
    spacing: 'compact' as const,
    path: `pageBuilder[_key=="k${index}"]`,
  })),
})

describe('SpacingUsageView', () => {
  it('shows the count and a link to each section, at its place in the document', () => {
    const html = render({ status: 'ready', documents: [document(2)] })
    expect(html).toContain('2 sections set their own spacing')
    expect(html).toContain('Sections left on Default follow it')
    expect(html).toContain('data-intent="edit"')
    expect(html).toContain('data-id="home"')
    expect(html).toContain('data-path="pageBuilder[_key==&quot;k1&quot;]"')
    expect(html).toContain('(Compact) in')
  })

  it('says so when no section sets its own spacing, with nothing to link', () => {
    const html = render({ status: 'ready', documents: [] })
    expect(html).toContain('No section sets its own spacing')
    expect(html).not.toContain('data-intent')
  })

  it('counts every section but lists a limited number', () => {
    const html = render({ status: 'ready', documents: [document(LISTED_LIMIT + 4)] })
    expect(html).toContain(`${LISTED_LIMIT + 4} sections set their own spacing`)
    expect(html.match(/data-intent/g)).toHaveLength(LISTED_LIMIT)
    expect(html).toContain('…and 4 more.')
  })

  it('says when the check fails, and shows a spinner while it runs', () => {
    expect(render({ status: 'error' })).toContain('Couldn’t check which sections')
    expect(render({ status: 'loading' })).not.toContain('sections set their own')
  })
})
