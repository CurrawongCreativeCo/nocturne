import { ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { InputErrorBoundary, InputErrorFallback, supportRoute } from './studio-input-boundary'

const boom = new Error('Element type is invalid')
const render = (element: React.ReactElement) =>
  renderToStaticMarkup(<ThemeProvider theme={buildTheme()}>{element}</ThemeProvider>)

/** Server rendering never runs error boundaries, so drive the class the way React does after a throw. */
function caught(client: boolean) {
  const boundary = new InputErrorBoundary({ client, children: 'input' })
  boundary.state = InputErrorBoundary.getDerivedStateFromError(boom)
  return boundary
}

describe('InputErrorBoundary', () => {
  it('renders its input while nothing throws', () => {
    expect(new InputErrorBoundary({ client: true, children: 'input' }).render()).toBe('input')
  })

  it('shows a client the safe message with Try again, never Unset value', () => {
    const element = caught(true).render() as React.ReactElement<{ onRetry: () => void }>
    expect(element.type).toBe(InputErrorFallback)
    const html = render(element)
    expect(html).toContain('This part of the page couldn&#x27;t be shown.')
    expect(html).toContain('Your content is safe.')
    expect(html).toContain('Try again')
    expect(html).not.toContain('Unset value')
    expect(html).not.toContain('Minified React error')
  })

  it('Try again clears the error so the input renders again', () => {
    const boundary = caught(true)
    const setState = vi.spyOn(boundary, 'setState').mockReturnValue(undefined)
    boundary.retry()
    expect(setState).toHaveBeenCalledWith({ error: null })
  })

  it('lets agency staff see the real error', () => {
    expect(() => caught(false).render()).toThrow(boom)
  })
})

describe('supportRoute', () => {
  it('prefers the support email, then the editing guide', () => {
    expect(supportRoute({ supportEmail: 'hi@example.com', guideUrl: 'https://g.test' })?.href).toBe(
      'mailto:hi@example.com',
    )
    expect(supportRoute({ guideUrl: 'https://g.test' })?.href).toBe('https://g.test')
    expect(supportRoute({})).toBeNull()
  })
})
