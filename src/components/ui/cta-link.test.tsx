import { readFileSync } from 'node:fs'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SITE_DECISIONS } from '@/lib/design/site-decisions'
import type { CtaData } from '@/types/sanity'

import { buttonFeedback, ctaClassName, ctaColours, CtaLink } from './cta-link'

const cta = (variant: 'primary' | 'secondary'): Omit<CtaData, '_key'> =>
  ({
    label: 'Book now',
    variant,
    link: { linkType: 'external', url: 'https://example.com/book' },
  }) as unknown as Omit<CtaData, '_key'>

/** The classes each button had before the site-wide button style (task 148), word for word. */
const BEFORE = {
  dark: {
    primary:
      'bg-ink-inverse text-surface-inverse hover:bg-ink-inverse/85 active:bg-ink-inverse/70 focus-visible:outline-ink-inverse',
    secondary:
      'ring-1 ring-inset ring-ink-inverse/40 text-ink-inverse hover:bg-ink-inverse/10 active:bg-ink-inverse/20 focus-visible:outline-ink-inverse',
  },
  light: {
    primary: 'bg-cta text-cta-ink hover:bg-cta/85 active:bg-cta/70',
    secondary: 'ring-1 ring-inset ring-line text-ink hover:bg-surface-alt active:bg-line',
  },
} as const

const classesOf = (markup: string) =>
  /class="([^"]*)"/.exec(markup.replace(/^<span[^>]*>/, ''))?.[1]

describe('button classes keep what they always had', () => {
  for (const surface of ['dark', 'light'] as const) {
    for (const variant of ['primary', 'secondary'] as const) {
      it(`${surface} ${variant}: every original class is still there, in order`, () => {
        const classes = ctaClassName(surface, variant)
        expect(classes).toContain(BEFORE[surface][variant])
        expect(classes).toContain(buttonFeedback)
        expect(classes.split(' ')).toEqual(
          expect.arrayContaining(BEFORE[surface][variant].split(' ')),
        )
      })
    }
  }

  it('adds only hook classes: fill and depth on the main button, soft fill on the secondary', () => {
    for (const surface of ['dark', 'light'] as const) {
      expect(ctaColours(surface, 'primary').replace(BEFORE[surface].primary, '').trim()).toBe(
        'cta-fill',
      )
      expect(ctaColours(surface, 'secondary').replace(BEFORE[surface].secondary, '').trim()).toBe(
        'cta-soft',
      )
      expect(ctaClassName(surface, 'primary').split(' ')).toContain('cta-primary-depth')
    }
  })

  it('never gives the secondary button a shadow or glow hook, on either surface', () => {
    for (const surface of ['dark', 'light'] as const) {
      expect(ctaClassName(surface, 'secondary')).not.toMatch(/depth|glow|shadow|cta-fill/)
      expect(ctaColours(surface, 'secondary')).not.toMatch(/depth|glow|shadow|cta-fill/)
    }
  })

  it('uses no filter on a button, so its text is never altered', () => {
    for (const surface of ['dark', 'light'] as const) {
      for (const variant of ['primary', 'secondary'] as const) {
        expect(ctaClassName(surface, variant)).not.toMatch(/brightness|filter|opacity-/)
      }
    }
    expect(buttonFeedback).toBe(
      'transition-[color,background-color,transform] duration-(--duration-fast) ease-out motion-safe:active:scale-[0.98] motion-reduce:transition-none',
    )
  })

  it('keeps the main button’s ctaColours free of depth, which a link list draws itself', () => {
    expect(ctaColours('light', 'primary')).not.toContain('cta-primary-depth')
  })
})

describe('CtaLink', () => {
  it('renders the same link, label and tracking as before, on both surfaces', () => {
    for (const surface of ['dark', 'light'] as const) {
      const html = renderToStaticMarkup(<CtaLink cta={cta('primary')} surface={surface} />)
      expect(html).toContain('href="https://example.com/book"')
      expect(html).toContain('>Book now<')
      expect(html).toContain('data-track-event="cta_click"')
      expect(classesOf(html)).toContain(BEFORE[surface].primary)
    }
  })

  it('applies the hooks by the CTA’s own variant', () => {
    const primary = renderToStaticMarkup(<CtaLink cta={cta('primary')} surface="light" />)
    const secondary = renderToStaticMarkup(<CtaLink cta={cta('secondary')} surface="light" />)
    expect(classesOf(primary)).toContain('cta-primary-depth')
    expect(classesOf(secondary)).toContain('cta-soft')
    expect(classesOf(secondary)).not.toContain('cta-primary-depth')
  })
})

describe('the site-wide button rules (globals.css)', () => {
  const css = readFileSync('src/styles/globals.css', 'utf8')
  // After the rule's own comment, which names the things the rules must not use.
  const block = css
    .slice(css.indexOf('*/', css.indexOf('Site-wide button style')) + 2)
    .replace(/\/\*[\s\S]*?\*\//g, '')
  const rules = [...block.matchAll(/(\.cta-[\w:.-]+)\s*\{([^}]*)\}/g)].map(
    ([, selector, body]) => ({ selector: selector ?? '', body: body ?? '' }),
  )

  it('is outside every layer, so it beats the classes it modifies', () => {
    expect(css.lastIndexOf('@layer', css.indexOf('Site-wide button style'))).toBeLessThan(
      css.lastIndexOf('}', css.indexOf('Site-wide button style')),
    )
    expect(block).not.toMatch(/@layer/)
  })

  it('hands back to the button’s own classes while its variable is unset', () => {
    expect(rules).toHaveLength(15)
    for (const { selector, body } of rules) {
      for (const declaration of body.split(';').filter((line) => line.includes('var(--button'))) {
        if (selector.includes(':hover') || selector.includes(':active')) {
          // Only a rule that changes nothing without its variable may be skipped: the hover/press
          // rules hand back too, or fall to the property's initial value where the classes set none.
          expect(declaration, selector).toMatch(/revert-layer|--button-fill/)
          continue
        }
        // The hover-depth layer has no classes of its own to hand back to: none, or no content, is "off".
        const layer = selector.includes('::after')
        expect(declaration, selector).toContain(layer ? 'none' : 'revert-layer')
      }
    }
  })

  it('touches no filter, outline or text style, and gives the secondary no shadow', () => {
    expect(block).not.toMatch(/filter|brightness|outline|text-shadow|font/)
    const soft = rules.filter(({ selector }) => selector.includes('.cta-soft'))
    expect(soft.length).toBe(4)
    for (const { body } of soft) expect(body).not.toMatch(/box-shadow|glow|--button-shadow|hover-/)
    const shadowed = rules.filter(({ body }) => body.includes('box-shadow'))
    expect(shadowed.map(({ selector }) => selector)).toEqual([
      '.cta-primary-depth',
      '.cta-primary-depth::after',
    ])
  })

  it('draws hover depth with a faded layer and a rise: opacity and translate, never an animated box-shadow', () => {
    const motion = block.slice(block.indexOf('@media (prefers-reduced-motion: no-preference)'))
    // Every rule that fades or moves is inside the no-preference query; nothing outside it does.
    const outside = block.slice(0, block.indexOf('@media (prefers-reduced-motion: no-preference)'))
    expect(outside).not.toMatch(/transition|translate|:hover::after|:focus-visible/)
    expect(motion).toMatch(/transition: opacity var\(--duration-fast\) var\(--ease-out\)/)
    expect(motion).toMatch(/translate: var\(--button-hover-translate, revert-layer\)/)
    const transitions = [...css.matchAll(/transition(?:-property)?:[^;]*;/g)]
      .map(([match]) => match)
      .filter((match) => match.includes('--button-hover') || match.includes('opacity var'))
    expect(transitions.length).toBeGreaterThan(0)
    for (const transition of transitions) expect(transition).not.toMatch(/box-shadow/)
    expect(/@keyframes[^{]*\{[^}]*box-shadow/.exec(css)).toBeNull()
    // The layer fades in for the pointer (where there is one) and for keyboard focus, not otherwise.
    expect(motion).toContain('@media (hover: hover)')
    expect(motion).toContain('.cta-primary-depth:focus-visible::after')
  })

  it('keeps the button’s own transition list and adds only translate to it', () => {
    const listed = /transition-\[([^\]]*)\]/.exec(buttonFeedback)?.[1]
    expect(listed).toBe('color,background-color,transform')
    const added = SITE_DECISIONS.buttonDepth.choices.soft['--button-hover-transition']
    expect(added).toBe(`${listed?.split(',').join(', ')}, translate`)
  })

  it('keeps the secondary’s outline on a section or card in the Primary colour, where a tint of white fails 4.5:1', () => {
    const accent = [...block.matchAll(/\[data-tone='accent'\] \.cta-soft[^{]*\{([^}]*)\}/g)]
    expect(accent.length).toBeGreaterThan(0)
    const body = accent.map(([, declarations]) => declarations).join(';')
    expect(body).toContain('background-color: revert-layer')
    expect(body).toContain('--tw-ring-color: revert-layer')
    expect(block).toMatch(/\[data-tone='accent'\] \.cta-soft:hover/)
    expect(block).toMatch(/\[data-tone='accent'\] \.cta-soft:active/)
  })

  it('veils the gradient on hover and press, never recolouring the text', () => {
    const hover = rules.find(({ selector }) => selector === '.cta-fill:hover')
    const active = rules.find(({ selector }) => selector === '.cta-fill:active')
    for (const rule of [hover, active]) {
      expect(rule?.body).toContain('--button-fill-veil')
      expect(rule?.body).not.toMatch(/(^|;)\s*color\s*:/)
    }
  })
})

describe('the button indicator (task 148, shared action fields on the cta object)', () => {
  const withIndicator = (extra: Record<string, unknown>) =>
    ({ ...cta('primary'), ...extra }) as unknown as Omit<CtaData, '_key'>
  const render = (data: Omit<CtaData, '_key'>, surface: 'dark' | 'light' = 'light') =>
    renderToStaticMarkup(<CtaLink cta={data} surface={surface} />)

  it('draws nothing, and adds no class, while no indicator is chosen (stored buttons are unchanged)', () => {
    for (const extra of [
      {},
      { actionStyle: null },
      { actionStyle: 'none' },
      { actionStyle: 'bogus' },
    ]) {
      const html = render(withIndicator(extra))
      expect(html).not.toContain('<svg')
      expect(classesOf(html)?.split(' ')).not.toContain('group')
      expect(classesOf(html)).not.toContain('gap-2')
    }
  })

  it('draws the chosen glyph after the label, decoratively, on both surfaces', () => {
    for (const surface of ['dark', 'light'] as const) {
      const html = render(withIndicator({ actionStyle: 'arrow', actionMotion: 'nudge' }), surface)
      expect(html).toContain('data-link-arrow="arrow"')
      expect(html).toContain('aria-hidden="true"')
      expect(html).toContain('data-action-motion="nudge"')
      expect(html.indexOf('Book now')).toBeLessThan(html.indexOf('<svg'))
      // The link is the group the indicator's hover and focus motion follows.
      expect(classesOf(html)?.split(' ')).toContain('group')
      expect(html).toContain('href="https://example.com/book"')
      expect(html).toContain('data-track-event="cta_click"')
    }
  })

  it('moves no indicator unless a motion is chosen, and takes the chosen colour', () => {
    expect(render(withIndicator({ actionStyle: 'chevron' }))).not.toContain('data-action-motion')
    expect(
      render(withIndicator({ actionStyle: 'arrow', actionColour: { colour: 'accent' } })),
    ).toContain('color:')
  })

  it('draws the diagonal arrow for a link that leaves the site, and the plain one on this site', () => {
    expect(render(withIndicator({ actionStyle: 'external' }))).toContain('data-action-glyph="out"')
    const internal = {
      link: { linkType: 'internal', slug: 'about' },
      actionStyle: 'external',
    }
    expect(render(withIndicator(internal))).toContain('data-action-glyph="arrow"')
  })

  it('does not change the label’s accessible name', () => {
    const html = render(withIndicator({ actionStyle: 'arrow' }))
    expect(html.replace(/<svg[\s\S]*?<\/svg>/, '')).toContain('>Book now</a>')
  })
})
