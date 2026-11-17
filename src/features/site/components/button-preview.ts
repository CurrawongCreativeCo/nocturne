import type { CSSProperties } from 'react'

import tokens from '@/styles/tokens.json'

/**
 * The glow halo sizes Task 146 defines (`--depth-glow-*`, scripts/build-tokens.mjs). The Studio loads
 * none of the site's CSS, so the preview supplies them; a test checks they equal the generated ones.
 */
export const PREVIEW_GLOW = {
  '--depth-glow-soft': '0 0 18px 0',
  '--depth-glow-soft-strength': '35%',
  '--depth-glow-strong': '0 0 28px 4px',
  '--depth-glow-strong-strength': '55%',
} as const

interface ButtonColours {
  accent: string
  cta: string
  ctaInk: string
  ink: string
  line: string
}

/**
 * The primary and secondary buttons of the Brand colours preview, drawn from the same `--button-*`
 * variables the site reads (`resolveDesignTokens`). The variables they refer to are set on `scope`, so
 * the shadow, glow, gradient and tint are the site's own declarations, not a second copy of them.
 */
export function buttonPreview(vars: Readonly<Record<string, string>>, colours: ButtonColours) {
  const scope = {
    '--shadow-card': tokens.shadow.card,
    '--shadow-soft': tokens.shadow.soft,
    '--shadow-raised': tokens.shadow.raised,
    '--color-accent': colours.accent,
    ...PREVIEW_GLOW,
    ...Object.fromEntries(Object.entries(vars).filter(([name]) => name.startsWith('--button-'))),
  } as CSSProperties
  const base: CSSProperties = {
    borderRadius: 999,
    padding: '6px 16px',
    fontSize: 13,
    fontWeight: 600,
  }
  return {
    scope,
    primary: {
      ...base,
      background: `var(--button-fill, ${colours.cta})`,
      color: `var(--button-fill-ink, ${colours.ctaInk})`,
      boxShadow: 'var(--button-depth, 0 0 #0000), var(--button-glow, 0 0 #0000)',
    } satisfies CSSProperties,
    secondary: {
      ...base,
      background: 'var(--button-secondary-fill, transparent)',
      color: colours.ink,
      boxShadow: `inset 0 0 0 1px var(--button-secondary-ring, ${colours.line})`,
    } satisfies CSSProperties,
  }
}
