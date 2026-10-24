import { ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { PreviewPanel, type PreviewStatus } from './preview-view'

// The container's hooks need Studio and its environment; the panel under test needs neither.
vi.mock('@/config/env', () => ({ apiVersion: '2025-01-01' }))
vi.mock('sanity', () => ({ useClient: vi.fn(), useCurrentUser: vi.fn() }))
vi.mock('sanity/router', () => ({ useIntentLink: vi.fn() }))

const noop = () => undefined

function render(status: PreviewStatus, extra: Partial<Parameters<typeof PreviewPanel>[0]> = {}) {
  return renderToStaticMarkup(
    <ThemeProvider theme={buildTheme()}>
      <PreviewPanel
        status={status}
        src={status === 'loading' || status === 'ready' ? 'https://site.test/api/x' : null}
        frameKey="/about#0"
        title="Preview of About"
        width="desktop"
        onWidth={noop}
        onRefresh={noop}
        onTryAgain={noop}
        onLoad={noop}
        presentationLink={<span>Open in Presentation</span>}
        {...extra}
      />
    </ThemeProvider>,
  )
}

describe('PreviewPanel', () => {
  it('asks for an address when the page has none', () => {
    const html = render('no-address')
    expect(html).toContain('Add an address to preview this page')
    expect(html).not.toContain('<iframe')
  })

  it('shows a loading state while the secret is made', () => {
    const html = render('preparing')
    expect(html).toContain('role="status"')
    expect(html).toContain('Loading preview')
    expect(html).not.toContain('<iframe')
  })

  it('titles the iframe and keeps it hidden until it has loaded', () => {
    const html = render('loading')
    expect(html).toContain('title="Preview of About"')
    expect(html).toContain('Loading preview')
    expect(html).toContain('opacity:0')
  })

  it('shows the page and the toolbar when ready', () => {
    const html = render('ready')
    expect(html).toContain('opacity:1')
    expect(html).not.toContain('Loading preview')
    expect(html).toContain('Refresh')
    expect(html).toContain('Open in Presentation')
    expect(html).toContain('aria-label="Desktop width"')
    expect(html).toContain('aria-label="Phone width"')
  })

  it('narrows the frame for phone width', () => {
    const html = render('ready', { width: 'phone' })
    expect(html).toContain('width:390px')
    expect(html).toMatch(/aria-pressed="true"/)
  })

  it('shows a plain error with Try again', () => {
    const html = render('error')
    expect(html).toContain('Try again')
    expect(html).not.toContain('<iframe')
  })
})
