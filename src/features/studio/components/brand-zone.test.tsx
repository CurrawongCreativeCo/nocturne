import { ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { BrandZone } from './brand-zone'

// StateLink needs Studio's router; a plain link shows the name and target the zone gives it.
vi.mock('sanity/router', () => ({
  StateLink: ({ children, ...rest }: { children?: ReactNode; state?: unknown }) => (
    <a {...{ ...rest, state: undefined }}>{children}</a>
  ),
}))
vi.mock('./studio-logo', () => ({ StudioLogo: () => <span>logo</span> }))

describe('BrandZone', () => {
  it('is a link named "Studio home" holding the logo', () => {
    const html = renderToStaticMarkup(
      <ThemeProvider theme={buildTheme()}>
        <BrandZone />
      </ThemeProvider>,
    )
    expect(html).toContain('aria-label="Studio home"')
    expect(html).toContain('<a ')
    expect(html).toContain('logo')
  })
})
