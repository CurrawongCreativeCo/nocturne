// @vitest-environment jsdom
import { ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PageBreadcrumb } from './page-breadcrumb'

const segments = [
  { label: 'services', id: 'services' },
  { label: 'web', id: 'web' },
  { label: 'web-design', current: true },
]
const Link = ({ id, children }: { id: string; children: React.ReactNode }) => (
  <a href={`#${id}`}>{children}</a>
)

beforeEach(() => {
  // A narrow pane: every observed element reports 200 px.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private callback: ResizeObserverCallback) {}
      observe() {
        this.callback([{ contentRect: { width: 200 } } as ResizeObserverEntry], this as never)
      }
      disconnect = vi.fn()
    },
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('PageBreadcrumb disclosure ids', () => {
  it('points aria-controls only at an existing, per-instance element', () => {
    render(
      <ThemeProvider theme={buildTheme()}>
        <PageBreadcrumb segments={segments} Link={Link} />
        <PageBreadcrumb segments={segments} Link={Link} />
      </ThemeProvider>,
    )
    const toggles = screen.getAllByRole('button', { name: 'Show the pages above this one' })
    expect(toggles).toHaveLength(2)
    const [first, second] = toggles as [HTMLElement, HTMLElement]
    for (const toggle of toggles) expect(toggle.hasAttribute('aria-controls')).toBe(false)

    fireEvent.click(first)
    fireEvent.click(second)
    const ids = toggles.map((toggle) => toggle.getAttribute('aria-controls'))
    expect(new Set(ids).size).toBe(2)
    for (const id of ids) expect(document.getElementById(id ?? '')).not.toBeNull()

    fireEvent.click(first)
    expect(first.hasAttribute('aria-controls')).toBe(false)
    expect(second.getAttribute('aria-controls')).toBe(ids[1])
  })
})
