import { readFileSync } from 'node:fs'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

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
  const block = css.slice(css.indexOf('*/', css.indexOf('Site-wide button style')) + 2)
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
    expect(rules).toHaveLength(7)
    for (const { selector, body } of rules) {
      for (const declaration of body.split(';').filter((line) => line.includes('var(--button'))) {
        if (selector.includes(':hover') || selector.includes(':active')) continue
        expect(declaration, selector).toContain('revert-layer')
      }
    }
  })

  it('touches no filter, outline, text style or opacity, and gives the secondary no shadow', () => {
    expect(block).not.toMatch(/filter|brightness|outline|opacity|text-shadow|font/)
    const soft = rules.filter(({ selector }) => selector.startsWith('.cta-soft'))
    expect(soft.length).toBe(3)
    for (const { body } of soft) expect(body).not.toMatch(/box-shadow|glow|--button-shadow/)
    const shadowed = rules.filter(({ body }) => body.includes('box-shadow'))
    expect(shadowed.map(({ selector }) => selector)).toEqual(['.cta-primary-depth'])
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
