import { ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PageBreadcrumb } from './page-breadcrumb'

const html = renderToStaticMarkup(
  <ThemeProvider theme={buildTheme()}>
    <PageBreadcrumb
      segments={[
        { label: 'services', id: 'services' },
        { label: 'ghost' },
        { label: 'web-design', current: true },
      ]}
      Link={({ id, children }) => <a href={`#${id}`}>{children}</a>}
    />
  </ThemeProvider>,
)

describe('PageBreadcrumb', () => {
  it('is a labelled landmark with the current page last', () => {
    expect(html).toContain('aria-label="Page location"')
    expect(html).toMatch(/aria-current="page"[^>]*><span>web-design</)
  })

  it('links existing ancestors and leaves missing ones as text', () => {
    expect(html).toContain('href="#services"')
    expect(html).not.toContain('href="#ghost"')
    expect(html).toContain('ghost')
  })
})
