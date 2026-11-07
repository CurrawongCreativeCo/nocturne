import { describe, expect, it, vi } from 'vitest'

import { parseHtml, renderToHtml } from '@/lib/design/capability-harness'

import { CardSurface } from './card-surface'
import { DecorativeMark } from './decorative-mark'

vi.mock('@/lib/sanity/site-design', () => ({
  getSiteDesign: () => Promise.resolve({ colours: undefined, gradients: [] }),
}))

const draw = async (input: Parameters<typeof DecorativeMark>[0]['input'], extra = {}) =>
  parseHtml(
    await renderToHtml(<DecorativeMark input={input} scope="section" tone="default" {...extra} />),
  )

const box = (document: Document) => document.querySelector('[data-decorative-mark]')

describe('DecorativeMark', () => {
  it('draws nothing while unset', async () => {
    expect(await renderToHtml(<DecorativeMark input={null} scope="card" tone="default" />)).toBe('')
  })

  it.each(['section', 'card', 'item'] as const)(
    'takes the same shape at %s scope',
    async (scope) => {
      const found = box(
        await draw(
          { kind: 'text', text: 'Thanks' },
          { scope, levels: scope === 'section' ? undefined : [{}] },
        ),
      )
      expect(found?.getAttribute('data-decorative-mark')).toBe(scope)
      expect(found?.getAttribute('data-mark-kind')).toBe('text')
    },
  )

  it('is decorative: hidden, never hit, never focusable, and clipped', async () => {
    const found = box(await draw({ kind: 'icon', icon: 'heart' }))
    expect(found?.getAttribute('aria-hidden')).toBe('true')
    for (const name of [
      'pointer-events-none',
      'absolute',
      'inset-0',
      'overflow-hidden',
      'select-none',
    ]) {
      expect(found?.className).toContain(name)
    }
    expect(found?.querySelector('a, button, input, [tabindex]')).toBeNull()
    expect(found?.querySelector('svg')?.getAttribute('focusable')).toBe('false')
  })

  it('draws words from an attribute, so they are never read or copied as content', async () => {
    const found = box(await draw({ kind: 'text', text: 'Thanks' }))
    expect(found?.textContent).toBe('')
    expect(found?.querySelector('[data-mark-text]')?.getAttribute('data-mark-text')).toBe('Thanks')
  })

  it('draws a picture as a mask that takes a tint, or in its own colours', async () => {
    const pictureUrl =
      'https://cdn.sanity.io/images/p/d/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-100x100.png'
    const tinted = box(await draw({ kind: 'picture', pictureUrl }))?.querySelector('span')
    expect(tinted?.getAttribute('style')).toMatch(
      /mask-image:url\(https:\/\/cdn\.sanity\.io\/images\/p\/d\/[^)]*w=1280/,
    )
    expect(tinted?.getAttribute('style')).toContain('background-color:currentColor')
    const own = box(await draw({ kind: 'picture', pictureUrl, keepColours: true }))?.querySelector(
      'span',
    )
    expect(own?.getAttribute('style')).toContain(
      'background-image:url(https://cdn.sanity.io/images/p/d/',
    )
    expect(own?.getAttribute('style')).not.toContain('mask-image')
  })

  it('places itself from its anchor and offset, in the container’s own measure', async () => {
    const style = box(
      await draw({
        kind: 'icon',
        icon: 'heart',
        anchor: 'top-right',
        offsetX: -10,
        rotation: 15,
        size: 'small',
      }),
    )
      ?.querySelector('svg')
      ?.getAttribute('style')
    expect(style).toContain('left:calc(100% + -10%)')
    expect(style).toContain('top:calc(0% + 0%)')
    expect(style).toContain('translate(-100%, 0%) rotate(15deg)')
    expect(style).toContain('width:20cqi')
  })

  it('scales or hides on phones with CSS alone', async () => {
    expect(
      box(await draw({ kind: 'icon', icon: 'heart', phoneScale: 'smaller' }))?.className,
    ).toContain('max-md:[--mark-scale:0.6]')
    expect(
      box(await draw({ kind: 'icon', icon: 'heart', phoneScale: 'hidden' }))?.className,
    ).toContain('max-md:hidden')
  })

  it('draws fainter rather than failing when the text needs it', async () => {
    const opacity = (colour: string) =>
      draw(
        { kind: 'icon', icon: 'heart', opacity: 20, colour: { colour: 'custom', hex: colour } },
        { levels: [{ quote: { colour: { colour: 'custom', hex: '#6b6b6b' } } }] },
      ).then((found) => box(found)?.querySelector('svg')?.getAttribute('style') ?? '')
    expect(await opacity('#ffffff')).toContain('opacity:0.2')
    // Fainter, not gone: at 20% this mark would take the quote below 4.5:1.
    expect(await opacity('#000000')).not.toContain('opacity:0.2')
  })
})

describe('CardSurface with a mark', () => {
  const CLASSES = 'flex bg-surface ring-1 ring-line'
  const OWN = { background: 'bg-surface', border: 'ring-1 ring-line', still: true }
  const drawCard = (mark: Parameters<typeof CardSurface>[0]['mark']) =>
    renderToHtml(
      <CardSurface as="figure" className={CLASSES} own={OWN} design={{}} mark={mark}>
        x
      </CardSurface>,
    )

  it('adds nothing at all without a mark', async () => {
    const unset = { input: null, scope: 'card', tone: 'default' } as const
    expect(await drawCard(unset)).toBe(`<figure class="${CLASSES}">x</figure>`)
    expect(await drawCard(undefined)).toBe(`<figure class="${CLASSES}">x</figure>`)
  })

  it('lays the mark over the card’s fill and under its content', async () => {
    const figure = parseHtml(
      await drawCard({
        input: { kind: 'icon', icon: 'heart' },
        scope: 'card',
        tone: 'default',
        levels: [{}],
      }),
    ).querySelector('figure')
    expect(figure?.className).toContain('relative isolate')
    expect(figure?.firstElementChild?.className).toContain('-z-10')
  })
})
