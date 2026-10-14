import { colorHex, colorOklch, studioBrand } from './tokens.generated'

/**
 * @deprecated The design tokens replace this file: edit src/styles/tokens.json and read
 * `src/config/tokens.generated.ts` (`colorHex`, `colorOklch`, `studioBrand`). These aliases only
 * keep older custom code compiling; they follow the `accent` and `accent-ink` tokens.
 */
export const brandColor = colorOklch.accent

/** @deprecated Use `colorHex.accent` from `@/config/tokens.generated`. */
export const brandColorHex = colorHex.accent

/** @deprecated Use `studioBrand.foreground` from `@/config/tokens.generated`. */
export const brandForegroundColor = studioBrand.foreground
