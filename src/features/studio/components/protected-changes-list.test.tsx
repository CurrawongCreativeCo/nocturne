import { ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { ProtectedChangesList } from './protected-changes-list'

vi.mock('sanity', () => ({
  useUser: (id: string) => [id === 'u1' ? { displayName: 'Ben Client' } : null, false],
}))

const changes = [{ path: ['pageBuilder', 'hero', 'imageShape'] }, { path: ['access'] }]

function render(authors: Map<string, string> | null, loading = false) {
  return renderToStaticMarkup(
    <ThemeProvider theme={buildTheme()}>
      <ProtectedChangesList changes={changes} authors={authors} loading={loading} />
    </ThemeProvider>,
  )
}

describe('ProtectedChangesList', () => {
  it('lists each field with who changed it', () => {
    const html = render(new Map([['pageBuilder.hero.imageShape', 'u1']]))
    expect(html).toContain('Page builder › Hero › Image shape')
    expect(html).toContain('changed by')
    expect(html).toContain('Ben Client')
    expect(html).toContain('Access')
  })

  it('says so while the history loads', () => {
    expect(render(null, true)).toContain('Looking up who made these changes')
  })

  it('lists the fields alone when the history cannot be read', () => {
    const html = render(null)
    expect(html).toContain('Page builder › Hero › Image shape')
    expect(html).toContain('couldn’t be loaded')
  })
})
