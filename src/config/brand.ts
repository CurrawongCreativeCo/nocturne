/**
 * The brand color for places CSS variables can't reach (the embedded Studio's chrome).
 * Must match `--color-brand` in src/styles/globals.css; brand.test.ts checks that it does.
 */
export const brandColor = 'oklch(0.55 0.2 264)'

/** Text color to put on top of `brandColor`; matches `--color-brand-foreground`. */
export const brandForegroundColor = 'oklch(0.99 0 0)'
