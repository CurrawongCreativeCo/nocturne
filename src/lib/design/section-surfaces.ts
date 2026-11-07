/**
 * Which section layouts draw their own surfaces (the Link list's cards, the CTA banner's card, the
 * hero's Image with panel), so the shared Panel doesn't apply to them. One rule, read on both sides:
 * the section schemas register it for the Studio (lib/sanity/schema/section-form.ts), and
 * SectionRenderer applies it on the page, so no section component has to remember it. Site-safe.
 */

type SurfaceRule = (layout: string | undefined) => boolean

const OWNS_SURFACES: Readonly<Record<string, SurfaceRule>> = {
  ctaBanner: () => true,
  // The hero's other layouts, and content with no layout stored (the Full background), take a Panel.
  hero: (layout) => layout === 'full-bleed',
  linkList: () => true,
}

/** Whether a section of this type, drawn in this layout, draws its own surfaces. */
export function ownsSurfaces(type: string | undefined, layout: string | null | undefined): boolean {
  const rule = type ? OWNS_SURFACES[type] : undefined
  return rule ? rule(layout ?? undefined) : false
}

// Functional sections: no marks on embeds or video players (their capability declarations say the same,
// which src/app/design-capabilities.test.ts holds them to).
const NO_SECTION_MARK: ReadonlySet<string> = new Set(['embed', 'video'])

/** Whether a section of this type takes a section-level decorative mark. */
export const takesSectionMark = (type: string | undefined): boolean =>
  type ? !NO_SECTION_MARK.has(type) : false
