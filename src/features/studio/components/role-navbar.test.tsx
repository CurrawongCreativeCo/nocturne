import { Button, ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { NavbarProps } from 'sanity'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AgencyControls, AgencyStrip } from './agency-controls'
import { RoleNavbar } from './role-navbar'

const state = vi.hoisted(() => ({ mediaIndex: 3, agency: true, previewing: false }))
const write = vi.hoisted(() => vi.fn())

vi.mock('@sanity/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useMediaIndex: () => state.mediaIndex,
}))
vi.mock('sanity', () => ({ useCurrentUser: () => ({}) }))
vi.mock('../roles', () => ({
  isAgency: () => state.agency,
  readClientViewPreview: () => state.previewing,
  writeClientViewPreview: write,
}))
vi.mock('./brand-zone', () => ({ BrandZone: () => <div>brand zone</div> }))

const renderDefault = () => <nav>sanity navbar</nav>
const navbarProps = { renderDefault } as unknown as NavbarProps
const render = () =>
  renderToStaticMarkup(
    <ThemeProvider theme={buildTheme()}>
      <RoleNavbar {...navbarProps} />
    </ThemeProvider>,
  )

function buttons(node: ReactNode): ReactElement<{ onClick: () => void; text: string }>[] {
  if (Array.isArray(node)) return node.flatMap(buttons)
  if (!isValidElement<{ children?: ReactNode }>(node)) return []
  return node.type === Button
    ? [node as ReactElement<{ onClick: () => void; text: string }>]
    : buttons(node.props.children)
}

const reload = vi.fn()
beforeEach(() => {
  Object.assign(state, { mediaIndex: 3, agency: true, previewing: false })
  vi.stubGlobal('window', { location: { reload } })
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('RoleNavbar from 900px', () => {
  it('puts the brand zone, Sanity navbar and agency controls in one row, in that order', () => {
    const html = render()
    const order = ['brand zone', 'sanity navbar', 'Agency view', 'Preview client view'].map(
      (text) => html.indexOf(text),
    )
    expect(order.every((at) => at >= 0)).toBe(true)
    expect(order).toEqual([...order].sort((a, b) => a - b))
    expect(html).not.toContain('Previewing client view')
  })

  it('shows "Client view" and "Back to agency" while previewing', () => {
    state.previewing = true
    const html = render()
    expect(html).toContain('Client view')
    expect(html).toContain('Back to agency')
    expect(html).not.toContain('Agency view')
  })

  it('shows clients the brand zone and navbar only', () => {
    state.agency = false
    const html = render()
    expect(html).toContain('brand zone')
    expect(html).not.toContain('Agency view')
    expect(html).not.toContain('Preview client view')
  })
})

describe('RoleNavbar below 900px', () => {
  beforeEach(() => {
    state.mediaIndex = 2
  })

  it('keeps the strip above the plain navbar, with no brand zone', () => {
    const html = render()
    expect(html).not.toContain('brand zone')
    expect(html.indexOf('Agency view')).toBeLessThan(html.indexOf('sanity navbar'))
    expect(html).toContain('Preview client view')
  })

  it('keeps the strip wording while previewing', () => {
    state.previewing = true
    const html = render()
    expect(html).toContain('Previewing client view')
    expect(html).toContain('Back to agency view')
  })

  it('shows clients the plain navbar', () => {
    state.agency = false
    expect(render()).toBe(renderToStaticMarkup(renderDefault()))
  })
})

describe.each([
  ['the bar', AgencyControls],
  ['the strip', AgencyStrip],
])('the switch in %s', (_name, Component) => {
  it.each([false, true])(
    'with previewing=%s writes the opposite setting and reloads',
    (previewing) => {
      state.previewing = previewing
      buttons(Component())[0]?.props.onClick()
      expect(write).toHaveBeenCalledWith(!previewing)
      expect(reload).toHaveBeenCalledOnce()
    },
  )
})
