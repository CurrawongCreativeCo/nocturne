import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { compareTarget } from './capability-harness'
import { applyPatch, withPicture } from './capability-patch'

/**
 * The shared harness on a small fixture component: a badge whose Loud layout draws its tone and whose
 * Quiet layout ignores it.
 */
function Badge({ layout, tone }: { layout: 'loud' | 'quiet'; tone?: string }) {
  return (
    <div className="badge">
      <span className={layout === 'loud' && tone ? `tone-${tone}` : 'tone-default'}>Hello</span>
    </div>
  )
}

const draw = (layout: 'loud' | 'quiet', state: { tone?: string }) =>
  renderToStaticMarkup(<Badge layout={layout} {...state} />)

describe('compareTarget', () => {
  it('keeps the unset output and sees the probe change the registered element', () => {
    const result = compareTarget(
      draw('loud', {}),
      draw('loud', { tone: 'accent' }),
      '.badge > span',
      'attributes',
    )
    expect(result).toEqual({ status: 'changed', unset: ['<span class="tone-default">'] })
  })

  it('reports a layout that ignores the field as unchanged', () => {
    expect(
      compareTarget(
        draw('quiet', {}),
        draw('quiet', { tone: 'accent' }),
        '.badge > span',
        'attributes',
      ).status,
    ).toBe('ignored')
  })

  it('treats a target that is not drawn as missing, never as unchanged', () => {
    expect(
      compareTarget(draw('loud', {}), draw('loud', { tone: 'accent' }), 'em', 'attributes'),
    ).toEqual({ status: 'missing', unset: [] })
  })

  it('compares everything inside the element in content mode', () => {
    expect(
      compareTarget(draw('loud', {}), draw('loud', { tone: 'accent' }), '.badge', 'attributes')
        .status,
    ).toBe('ignored')
    expect(
      compareTarget(draw('loud', {}), draw('loud', { tone: 'accent' }), '.badge', 'content').status,
    ).toBe('changed')
  })
})

describe('applyPatch', () => {
  it('sets dotted paths, making objects and lists on the way, and unsets with null', () => {
    const base = { style: { tone: 'alt' }, links: [{ _key: 'a', label: 'One' }], media: ['x'] }
    expect(
      applyPatch(base, {
        'style.panel': 'solid',
        'links.0.design.border': 'thick',
        'items.0.quote': 'Hi',
        media: null,
      }),
    ).toEqual({
      style: { tone: 'alt', panel: 'solid' },
      links: [{ _key: 'a', label: 'One', design: { border: 'thick' } }],
      items: [{ quote: 'Hi' }],
    })
    // The original is left alone.
    expect(base.style).toEqual({ tone: 'alt' })
  })

  it('points $picture at a real asset', () => {
    expect(
      withPicture(
        { image: { asset: { _ref: '$picture' } }, list: [{ _ref: '$picture' }] },
        'image-1',
      ),
    ).toEqual({ image: { asset: { _ref: 'image-1' } }, list: [{ _ref: 'image-1' }] })
  })
})
