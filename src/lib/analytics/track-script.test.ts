import { runInNewContext } from 'node:vm'

import { describe, expect, it } from 'vitest'

import { TRACK_SCRIPT, trackAttributes } from './track-script'

type Handler = (event: { target: unknown }) => void

/** A page with the script run on it, and the calls the providers received. */
function setup(providers: Record<string, unknown> = {}) {
  let click: Handler | undefined
  const window: Record<string, unknown> = {
    location: { pathname: '/links' },
    ...providers,
  }
  runInNewContext(TRACK_SCRIPT, {
    window,
    document: {
      addEventListener: (type: string, handler: Handler) => {
        if (type === 'click') click = handler
      },
    },
    JSON,
  })
  return { window, click: (target: unknown) => click?.({ target }) }
}

/** An element whose `closest` finds a tracked item and a control, or neither. */
const target = ({
  item,
  control = true,
}: {
  item?: { event: string; props: string }
  control?: boolean
}) => ({
  closest: (selector: string) => {
    if (selector === '[data-track-event]' && item) {
      return {
        getAttribute: (name: string) => (name === 'data-track-event' ? item.event : item.props),
      }
    }
    return selector === 'a,button' && control ? {} : null
  },
})

describe('TRACK_SCRIPT', () => {
  it('sends a clicked item’s event to every provider that has loaded, with the page’s path', () => {
    const calls: unknown[][] = []
    const { click } = setup({
      plausible: (...args: unknown[]) => calls.push(['plausible', ...args]),
      posthog: { capture: (...args: unknown[]) => calls.push(['posthog', ...args]) },
      gtag: (...args: unknown[]) => calls.push(['gtag', ...args]),
    })
    click(target({ item: { event: 'link_click', props: '{"label":"Book"}' } }))

    const props = { label: 'Book', page: '/links' }
    expect(calls).toEqual([
      ['plausible', 'link_click', { props }],
      ['posthog', 'link_click', props],
      ['gtag', 'event', 'link_click', props],
    ])
  })

  it('does nothing when no provider has loaded (no consent), and does not throw', () => {
    const { click } = setup()
    expect(() => {
      click(target({ item: { event: 'link_click', props: '{}' } }))
    }).not.toThrow()
  })

  it('lets one failing provider leave the others alone', () => {
    const calls: unknown[][] = []
    const { click } = setup({
      plausible: () => {
        throw new Error('blocked')
      },
      gtag: (...args: unknown[]) => calls.push(args),
    })
    click(target({ item: { event: 'link_click', props: '{}' } }))
    expect(calls).toHaveLength(1)
  })

  it('ignores a click outside a tracked item, or on one that isn’t a link or button', () => {
    const calls: unknown[][] = []
    const { click } = setup({ gtag: (...args: unknown[]) => calls.push(args) })
    click(target({}))
    click(target({ item: { event: 'link_click', props: '{}' }, control: false }))
    click(null)
    click({})
    expect(calls).toEqual([])
  })

  it('copes with props that aren’t JSON', () => {
    const calls: unknown[][] = []
    const { click } = setup({ gtag: (...args: unknown[]) => calls.push(args) })
    click(target({ item: { event: 'link_click', props: 'not json' } }))
    expect(calls).toEqual([['event', 'link_click', { page: '/links' }]])
  })

  it('also defines window.trackEvent for other code to call', () => {
    const calls: unknown[][] = []
    const { window } = setup({ gtag: (...args: unknown[]) => calls.push(args) })
    ;(window.trackEvent as (name: string, props: object) => void)('sign_up', { plan: 'pro' })
    expect(calls).toEqual([['event', 'sign_up', { plan: 'pro' }]])
  })
})

describe('trackAttributes', () => {
  it('names the event and carries the props as JSON', () => {
    expect(trackAttributes('link_click', { label: 'Book', position: 2, outbound: true })).toEqual({
      'data-track-event': 'link_click',
      'data-track-props': '{"label":"Book","position":2,"outbound":true}',
    })
  })
})
