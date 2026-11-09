import { describe, expect, it } from 'vitest'

import {
  CARD_SHADOW_CLASS,
  OWN_SHADOW,
  depthFilter,
  depthLook,
  glowTargetsOf,
  resolveDepth,
} from './depth-options'

const shadowOf = (depth: ReturnType<ReturnType<typeof resolveDepth>['links']>) =>
  (depth?.style as Record<string, string> | undefined)?.['--depth-shadow']

describe('resolveDepth', () => {
  it('leaves every element as the layout draws it while nothing is chosen', () => {
    const depth = resolveDepth(undefined)
    expect(depth.links(OWN_SHADOW.card)).toBeUndefined()
    expect(depth.social(OWN_SHADOW.glass)).toBeUndefined()
    expect(depth.picture).toBeUndefined()
    expect(resolveDepth({ glow: 'off', glowTargets: ['links'] }).links(OWN_SHADOW.card)).toBe(
      undefined,
    )
  })

  it('replaces a link’s own shadow with the chosen level, through the shadow tokens', () => {
    const depth = resolveDepth({ linkShadow: 'floating' })
    expect(depth.links(OWN_SHADOW.card)).toEqual({
      className: 'shadow-(--depth-shadow)',
      style: { '--depth-shadow': 'var(--shadow-floating)' },
    })
    // Flat has to sit in a list with a glow, so it is a transparent shadow rather than `none`.
    expect(shadowOf(resolveDepth({ linkShadow: 'flat' }).links(OWN_SHADOW.card))).toBe('0 0 #0000')
  })

  it('adds a glow to the element’s own shadow when only a glow is chosen', () => {
    const value = shadowOf(resolveDepth({ glow: 'soft' }).links(OWN_SHADOW.glass))
    expect(value).toBe(
      'var(--glass-shadow), var(--depth-glow-soft) color-mix(in oklch, var(--color-accent-text) var(--depth-glow-soft-strength), transparent)',
    )
  })

  it('glows in the chosen theme colour, and only a valid Custom hex reaches CSS', () => {
    const highlight = resolveDepth({ glow: 'strong', glowColour: { colour: 'highlight' } })
    expect(shadowOf(highlight.links(OWN_SHADOW.none))).toContain('var(--color-highlight)')
    expect(shadowOf(highlight.links(OWN_SHADOW.none))).toContain('var(--depth-glow-strong)')
    const custom = resolveDepth({ glow: 'soft', glowColour: { colour: 'custom', hex: '#c9a227' } })
    expect(shadowOf(custom.links(OWN_SHADOW.none))).toContain('#c9a227')
    const tampered = resolveDepth({
      glow: 'soft',
      glowColour: { colour: 'custom', hex: 'red;background:url(x)' },
    })
    expect(shadowOf(tampered.links(OWN_SHADOW.none))).not.toContain('url(')
  })

  it('glows only around the ticked elements, the links when none are ticked', () => {
    expect(glowTargetsOf(undefined)).toEqual(['links'])
    expect(glowTargetsOf(['bogus'])).toEqual(['links'])
    const social = resolveDepth({ glow: 'soft', glowTargets: ['social'] })
    expect(social.links(OWN_SHADOW.card)).toBeUndefined()
    expect(shadowOf(social.social(OWN_SHADOW.card))).toContain('color-mix')
  })

  it('shadows the picture with a filter, so it follows a round crop or a transparent logo', () => {
    const depth = resolveDepth({ pictureShadow: 'raised', glow: 'soft', glowTargets: ['picture'] })
    expect(depth.picture?.className).toBe('[filter:var(--depth-filter)]')
    const filter = (depth.picture?.style as Record<string, string> | undefined)?.['--depth-filter']
    expect(filter?.startsWith('var(--depth-picture-raised) drop-shadow(0 0 9px color-mix(')).toBe(
      true,
    )
    expect(resolveDepth({ pictureShadow: 'flat' }).picture).toBeUndefined()
  })

  it('ignores values the schema never offers', () => {
    const depth = resolveDepth({ linkShadow: 'enormous', glow: 'blinding' })
    expect(depth.links(OWN_SHADOW.card)).toBeUndefined()
  })
})

describe('depthLook', () => {
  const SOFT = 'var(--shadow-soft, var(--shadow-card))'
  const style = (look: ReturnType<typeof depthLook>) =>
    (look?.style as Record<string, string> | undefined)?.['--depth-shadow']

  it('is undefined while neither a level nor a glow is chosen', () => {
    expect(depthLook({}, OWN_SHADOW.siteCard)).toBeUndefined()
    expect(depthLook({ glow: 'off' }, OWN_SHADOW.siteCard)).toBeUndefined()
  })

  it('draws an explicit Soft through its own token, never through the site’s card shadow', () => {
    expect(style(depthLook({ level: 'soft' }, OWN_SHADOW.siteCard))).toBe(SOFT)
    expect(style(depthLook({ level: 'soft' }, OWN_SHADOW.siteCard))).not.toContain('--card-depth')
  })

  it('replaces whatever the card draws, including the site’s Card depth, with the chosen level', () => {
    const look = depthLook({ level: 'flat' }, OWN_SHADOW.siteCard)
    expect(look?.className).toBe('shadow-(--depth-shadow)')
    expect(style(look)).toBe('0 0 #0000')
  })

  it('keeps the card’s own (site or family) shadow when only a glow is chosen', () => {
    expect(style(depthLook({ glow: 'soft' }, OWN_SHADOW.siteCard))).toMatch(
      /^var\(--card-depth, var\(--shadow-card\)\), var\(--depth-glow-soft\)/,
    )
    expect(style(depthLook({ glow: 'strong' }, OWN_SHADOW.siteCardFree))).toMatch(
      /^var\(--card-depth, 0 0 #0000\), var\(--depth-glow-strong\)/,
    )
  })

  it('takes the glow colour as a theme colour', () => {
    expect(
      style(depthLook({ glow: 'soft', glowColour: { colour: 'custom', hex: '#ff0000' } }, 'x')),
    ).toContain('#ff0000')
  })
})

describe('depthFilter', () => {
  it('is undefined while nothing is chosen', () => {
    expect(depthFilter({})).toBeUndefined()
    expect(depthFilter({ glow: 'off' })).toBeUndefined()
  })

  it('combines a level and a glow into one filter', () => {
    const filter = (
      depthFilter({ level: 'raised', glow: 'soft' })?.style as Record<string, string>
    )['--depth-filter']
    expect(filter).toMatch(/^var\(--depth-picture-raised\) drop-shadow\(0 0 9px/)
  })
})

describe('the card shadow classes', () => {
  it('read the site’s Card depth with the family’s own shadow as the fallback', () => {
    expect(CARD_SHADOW_CLASS.shadowed).toBe('shadow-(--card-depth,var(--shadow-card))')
    expect(CARD_SHADOW_CLASS.free).toBe('shadow-(--card-depth,0_0_#0000)')
  })
})
