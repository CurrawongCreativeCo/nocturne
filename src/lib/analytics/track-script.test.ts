import { runInNewContext } from 'node:vm'

import { describe, expect, it } from 'vitest'

import { TRACK_SCRIPT, trackAttributes } from './track-script'

type Handler = (event: { target: unknown }) => void

/** A page with the script run on it, and the events its `window.trackEvent` received. */
function setup(trackEvent: ((...args: unknown[]) => void) | undefined) {
  let click: Handler | undefined
  runInNewContext(TRACK_SCRIPT, {
    window: { location: { pathname: '/links' }, trackEvent },
    document: {
      addEventListener: (type: string, handler: Handler) => {
        if (type === 'click') click = handler
      },
    },
    JSON,
  })
  return (target: unknown) => click?.({ target })
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
  it('hands a clicked item’s event to window.trackEvent with the page’s path', () => {
    const calls: unknown[][] = []
    const click = setup((...args) => calls.push(args))
    click(target({ item: { event: 'link_click', props: '{"label":"Book"}' } }))
    expect(calls).toEqual([['link_click', { label: 'Book', page: '/links' }]])
  })

  it('does nothing when there is no dispatcher, and does not throw', () => {
    const click = setup(undefined)
    expect(() => {
      click(target({ item: { event: 'link_click', props: '{}' } }))
    }).not.toThrow()
  })

  it('never lets a failing dispatcher break the click', () => {
    const click = setup(() => {
      throw new Error('blocked')
    })
    expect(() => {
      click(target({ item: { event: 'link_click', props: '{}' } }))
    }).not.toThrow()
  })

  it('ignores a click outside a tracked item, or on one that isn’t a link or button', () => {
    const calls: unknown[][] = []
    const click = setup((...args) => calls.push(args))
    click(target({}))
    click(target({ item: { event: 'link_click', props: '{}' }, control: false }))
    click(null)
    click({})
    expect(calls).toEqual([])
  })

  it('copes with props that aren’t JSON', () => {
    const calls: unknown[][] = []
    const click = setup((...args) => calls.push(args))
    click(target({ item: { event: 'link_click', props: 'not json' } }))
    expect(calls).toEqual([['link_click', { page: '/links' }]])
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
