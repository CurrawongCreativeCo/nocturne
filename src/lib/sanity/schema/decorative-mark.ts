import { defineField, defineType, type ConditionalPropertyCallback } from 'sanity'

import { BODY_TEXT_RATIO } from '@/lib/color/background-contrast'
import { markOpacityAt } from '@/lib/color/mark-contrast'

import {
  MARK_ALIGNS,
  MARK_ALIGN_TITLES,
  MARK_ANCHORS,
  MARK_FONTS,
  MARK_FONT_TITLES,
  MARK_KINDS,
  MARK_KIND_TITLES,
  MARK_LAYERS,
  MARK_LAYER_TITLES,
  MARK_OFFSET_MAX,
  MARK_OPACITY_MAX,
  MARK_OPACITY_MIN,
  MARK_PHONE_SCALES,
  MARK_PHONE_SCALE_TITLES,
  MARK_ROTATION_MAX,
  MARK_ROTATION_STEP,
  MARK_SIZES,
  MARK_SIZE_TITLES,
  MARK_TEXT_MAX,
  markAnchorTitle,
  type MarkKind,
} from '../decorative-mark-options'
import { badgeIconField } from './badge-icon-field'
import { fetchBrandColours } from './brand-colours'
import { builtOptions } from './capability-marker'
import { allowsPanel, sectionAtStylePath } from './section-form'
import { choiceField } from './surface-design'
import { themeColourField } from './theme-colour'

/**
 * The shared `decorativeMark` object (task 156; README, "Decorative marks"): one field shape at every
 * scope, up to one per scope. Empty (or None) draws nothing, so adding a field of this type changes no
 * page. DecorativeMark (components/ui/decorative-mark.tsx) draws it, from `resolveDecorativeMark`. Pictures
 * are approved frames (Design > Image frames), under the same rules as frame artwork.
 */

interface StoredMark {
  kind?: string
  keepColours?: boolean
  opacity?: number
  colour?: { colour?: string; hex?: string }
}
type PathSegment = string | number | { _key: string } | [number, number]

const markOf = (parent: unknown) => (parent ?? {}) as StoredMark
const off: ConditionalPropertyCallback = ({ parent }) => (markOf(parent).kind ?? 'none') === 'none'
const kindIsNot =
  (kind: MarkKind): ConditionalPropertyCallback =>
  ({ parent }) =>
    markOf(parent).kind !== kind

const radio = <T extends string>(values: readonly T[], title: (value: T) => string) => ({
  list: values.map((value) => ({ value, title: title(value) })),
  layout: 'radio' as const,
  direction: 'horizontal' as const,
})

/** The section and the card or item levels the mark at `path` sits in, read from the form's document. */
function levelsAt(document: unknown, path: readonly PathSegment[]) {
  let current: unknown = document
  let section: Record<string, unknown> | undefined
  const levels: Record<string, unknown>[] = []
  for (const segment of path.slice(0, -2)) {
    if (current === null || typeof current !== 'object') return { section, levels }
    if (typeof segment === 'object' && '_key' in segment) {
      current = (current as { _key?: string }[]).find((item) => item._key === segment._key)
      section ??= current as Record<string, unknown> | undefined
      continue
    }
    current = (current as Record<string, unknown>)[String(segment)]
    if (section && segment !== 'style' && current && typeof current === 'object') {
      levels.push(current as Record<string, unknown>)
    }
  }
  return { section, levels }
}

/** What the Studio warns: the same decision the site makes when drawing, in words. */
export function markOpacityWarning(
  mark: StoredMark,
  context: {
    section?: Record<string, unknown>
    levels: readonly Record<string, unknown>[]
    site?: Parameters<typeof markOpacityAt>[0]['site']
  },
): string | true {
  const kind = mark.kind as keyof typeof MARK_OPACITY_MAX | undefined
  if (!kind || !(kind in MARK_OPACITY_MAX) || mark.opacity === undefined) return true
  const style = (context.section?.style ?? {}) as {
    tone?: string
    image?: unknown
    gradient?: string
    panel?: string
  }
  const opacity = mark.opacity / 100
  const safe = markOpacityAt({
    opacity,
    colour: mark.colour,
    ownColours: kind === 'picture' && mark.keepColours === true,
    tone: style.tone,
    ...(context.levels.length > 0 ? { levels: context.levels } : {}),
    backdrop: Boolean(style.image ?? (style.gradient && style.gradient !== 'none')),
    site: context.site,
  })
  if (safe >= opacity) return true
  return safe === 0
    ? `Text next to this mark would fall below ${String(BODY_TEXT_RATIO)}:1, so the site doesn’t draw it. Choose a fainter colour.`
    : `Text next to this mark would fall below ${String(BODY_TEXT_RATIO)}:1, so the site draws it at ${String(Math.round(safe * 1000) / 10)}%.`
}

export const decorativeMark = defineType({
  name: 'decorativeMark',
  title: 'Decorative mark',
  type: 'object',
  // A shared design capability (lib/design/capabilities.ts): every field of this type is one.
  options: builtOptions('decorativeMark', { collapsible: true, collapsed: true }, 'mark'),
  fieldsets: [
    {
      name: 'position',
      title: 'Position',
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    defineField({
      name: 'kind',
      title: 'Mark',
      type: 'string',
      description: 'A faint word, picture or icon behind the text. It is decoration only.',
      options: radio(MARK_KINDS, (kind) => MARK_KIND_TITLES[kind]),
    }),
    defineField({
      name: 'text',
      title: 'Words',
      type: 'string',
      hidden: kindIsNot('text'),
      validation: (rule) => rule.max(MARK_TEXT_MAX),
    }),
    choiceField({
      name: 'font',
      title: 'Font',
      values: MARK_FONTS,
      titles: MARK_FONT_TITLES,
      inherits: 'Display',
      hidden: kindIsNot('text'),
    }),
    choiceField({
      name: 'align',
      title: 'Text alignment',
      description: 'For words that wrap onto a second line.',
      values: MARK_ALIGNS,
      titles: MARK_ALIGN_TITLES,
      inherits: 'Centre',
      hidden: kindIsNot('text'),
    }),
    defineField({
      name: 'picture',
      title: 'Approved picture',
      type: 'reference',
      to: [{ type: 'frame' }],
      options: { disableNew: true },
      description:
        'A transparent PNG, WebP or SVG the agency has added under Design > Image frames.',
      hidden: kindIsNot('picture'),
    }),
    defineField({
      name: 'keepColours',
      title: 'Keep the picture’s own colours',
      type: 'boolean',
      description: 'Off, the picture takes the colour below.',
      initialValue: false,
      hidden: kindIsNot('picture'),
    }),
    badgeIconField({ name: 'icon', title: 'Icon', hidden: kindIsNot('icon') }),
    choiceField({
      name: 'size',
      title: 'Size',
      description: 'Relative to what it sits in.',
      values: MARK_SIZES,
      titles: MARK_SIZE_TITLES,
      inherits: 'Medium',
      hidden: off,
    }),
    choiceField({
      name: 'phoneScale',
      title: 'On phones',
      values: MARK_PHONE_SCALES,
      titles: MARK_PHONE_SCALE_TITLES,
      inherits: 'Same',
      hidden: off,
    }),
    themeColourField({
      name: 'colour',
      title: 'Colour',
      usage: 'graphic',
      decorative: true,
      inherits: 'the text colour',
      hidden: (context) =>
        (context.parent as StoredMark | undefined)?.kind === undefined ||
        off(context) ||
        markOf(context.parent).keepColours === true,
    }),
    defineField({
      name: 'opacity',
      title: 'Opacity (%)',
      type: 'number',
      description: `${String(MARK_OPACITY_MIN)}–${String(MARK_OPACITY_MAX.text)}% for words and icons, up to ${String(MARK_OPACITY_MAX.picture)}% for pictures. Empty is a faint default. The site draws it fainter if the text needs it.`,
      hidden: off,
      validation: (rule) => [
        rule.min(MARK_OPACITY_MIN).max(MARK_OPACITY_MAX.picture),
        rule
          .custom(async (_value, context) => {
            const { section, levels } = levelsAt(
              context.document,
              context.path as readonly PathSegment[],
            )
            const { colours } = await fetchBrandColours(
              context.getClient({ apiVersion: '2025-01-01' }),
            )
            return markOpacityWarning(markOf(context.parent), { section, levels, site: colours })
          })
          .warning(),
      ],
    }),
    defineField({
      name: 'anchor',
      title: 'Anchor',
      type: 'string',
      fieldset: 'position',
      description: 'Where it sits. Empty is the top centre.',
      options: { list: MARK_ANCHORS.map((value) => ({ value, title: markAnchorTitle(value) })) },
      hidden: off,
    }),
    defineField({
      name: 'offsetX',
      title: 'Move across (%)',
      type: 'number',
      fieldset: 'position',
      description: `±${String(MARK_OFFSET_MAX)}% of what it sits in. Anything past the edge is cut off.`,
      hidden: off,
      validation: (rule) => rule.min(-MARK_OFFSET_MAX).max(MARK_OFFSET_MAX),
    }),
    defineField({
      name: 'offsetY',
      title: 'Move down (%)',
      type: 'number',
      fieldset: 'position',
      description: `±${String(MARK_OFFSET_MAX)}% of what it sits in. Anything past the edge is cut off.`,
      hidden: off,
      validation: (rule) => rule.min(-MARK_OFFSET_MAX).max(MARK_OFFSET_MAX),
    }),
    defineField({
      name: 'rotation',
      title: 'Rotation (°)',
      type: 'number',
      fieldset: 'position',
      description: `−${String(MARK_ROTATION_MAX)}° to ${String(MARK_ROTATION_MAX)}°, in steps of ${String(MARK_ROTATION_STEP)}°.`,
      hidden: off,
      validation: (rule) => rule.min(-MARK_ROTATION_MAX).max(MARK_ROTATION_MAX),
    }),
    defineField({
      name: 'layer',
      title: 'Layer',
      type: 'string',
      fieldset: 'position',
      description: 'Only matters on a section with a panel. Empty is behind the content.',
      options: radio(MARK_LAYERS, (layer) => MARK_LAYER_TITLES[layer]),
      // Only a section's mark has a panel to go behind, and only a section with one.
      hidden: ({ document, path, parent }) => {
        if ((markOf(parent).kind ?? 'none') === 'none' || !path.includes('style')) return true
        const section = sectionAtStylePath(document, path)
        const panel = (section?.style as { panel?: string } | undefined)?.panel
        return !allowsPanel(section) || !panel || panel === 'none'
      },
    }),
  ],
})
