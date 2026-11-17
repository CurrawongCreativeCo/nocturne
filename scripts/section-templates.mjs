/**
 * The files `npm run new:section` writes for a new section. Pure string builders, so
 * section-templates.test.mjs can check that a new section starts with the shared Design options:
 * the Design field group and `style` field (schema), `style { ${sectionStyleFields} }` (GROQ) and a
 * SectionFrame (component).
 */

/**
 * `schemas/sections/<kebab>-capabilities.ts`: the new section's design capability declaration (task 275;
 * README, "Design capability contract"). Every capability starts Not applicable with the reason "Not
 * reviewed yet", which `npm run design-capabilities` (and so `npm run check`) rejects: a new section
 * can't merge until each capability is reviewed as Required, Conditional (with a trigger) or Not
 * applicable (with its reason).
 */
export function capabilitiesTemplate({ typeName, title }) {
  return `import { declareCapabilities, notApplicable } from '@/lib/design/capabilities'

// Not reviewed yet: \`npm run design-capabilities\` fails until each one below is reviewed. For each,
// choose { policy: 'required', scope }, { policy: 'conditional', scope, trigger } (a trigger names the
// section's anatomy, a layout or a stored setting) or notApplicable('why'). Name layouts when a
// policy doesn't apply to all of them. README, "Design capability contract", says how.
const NOT_REVIEWED = notApplicable('Not reviewed yet')

/** The design capabilities of the ${escapeJs(title)} section (task 275). */
export const ${typeName}Capabilities = declareCapabilities({
  surface: NOT_REVIEWED,
  text: NOT_REVIEWED,
  header: NOT_REVIEWED,
  mark: NOT_REVIEWED,
  depth: NOT_REVIEWED,
  icon: NOT_REVIEWED,
  action: NOT_REVIEWED,
  framing: NOT_REVIEWED,
  pictureDepth: NOT_REVIEWED,
  overlay: NOT_REVIEWED,
  glass: NOT_REVIEWED,
  divider: NOT_REVIEWED,
  edge: NOT_REVIEWED,
  motion: NOT_REVIEWED,
  slots: NOT_REVIEWED,
})
`
}

export function schemaTemplate({ typeName, title }, variants = []) {
  const hasVariants = variants.length > 0
  const constName = `${typeName.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}_VARIANTS`
  return `import { BlockElementIcon } from '@sanity/icons/BlockElement'
import { defineField, defineType } from 'sanity'

import { accessField } from '@/lib/sanity/schema/access-field'
${hasVariants ? "import { PlaceholderThumbnail } from '@/lib/sanity/schema/placeholder-thumbnail'\n" : ''}import { sectionFields, sectionFieldsets, sectionGroups } from '@/lib/sanity/schema/section-style'
import { ${hasVariants ? 'variantField, variantSubtitle' : 'joinSubtitle, toneTitle'} } from '@/lib/sanity/schema/section-variant'

import { ${typeName}Capabilities } from './${kebabOf(typeName)}-capabilities'${
    hasVariants
      ? `

/**
 * One component per variant in components/sections/${kebabOf(typeName)}/. The first is the default: what
 * content without a variant renders. At most four per section. Add a \`description\` to each, and replace
 * the placeholder thumbnail with a drawing of the layout.
 */
export const ${constName} = [
${variants.map((v) => `  { value: '${v.kebab}', title: '${escapeJs(v.title)}', thumbnail: PlaceholderThumbnail },`).join('\n')}
] as const`
      : ''
  }

export const ${typeName} = defineType({
  name: '${typeName}',
  title: '${title}',
  type: 'object',
  icon: BlockElementIcon,
  // What it should offer of the shared design capabilities: see ${kebabOf(typeName)}-capabilities.ts.
  options: { designCapabilities: ${typeName}Capabilities },
  // Content, plus the agency-only Design tab (the shared \`style\` field that sectionFields adds).
  groups: sectionGroups,
  fieldsets: sectionFieldsets,
  fields: sectionFields(
    [
      defineField({ name: 'title', type: 'string', validation: (rule) => rule.required() }),
      defineField({ name: 'text', type: 'text', rows: 3 }),
      accessField,${hasVariants ? `\n      // Shown first in the Content tab. Give each variant a description and a thumbnail picture.\n      variantField(${constName}),` : ''}
    ],
    // How this section starts when added. Keep it equal to DEFAULTS in the component.
    { align: 'start' },
    // Which design options suit which layout: add a third argument, { rules: { type: '${typeName}', hasPicture, fixesAlignment } },
    // once a layout has a picture (Parallax) or sets its own alignment.
  ),
  preview: {
    select: { title: 'title'${hasVariants ? ", variant: 'variant'" : ''}, tone: 'style.tone' },
    prepare: ({ title${hasVariants ? ', variant' : ''}, tone }: { title?: string${hasVariants ? '; variant?: string' : ''}; tone?: string }) => ({
      title: title || 'Untitled',
      subtitle: ${hasVariants ? `variantSubtitle('${escapeJs(title)}', ${constName}, variant, tone)` : `joinSubtitle('${escapeJs(title)}', toneTitle(tone))`},
    }),
  },
})
`
}

export function fragmentTemplate({ typeName }, variants = []) {
  return `export const ${typeName}Fragment = /* groq */ \`
  _type == "${typeName}" && (access != "members" || $members) => {
    style { \${sectionStyleFields} },${variants.length > 0 ? '\n    variant,' : ''}
    title,
    text
  }
\`

`
}

export function galleryTemplate({ kebab, typeName, title }, variants = []) {
  const entry = (key, extra = '') => `  {
    _key: '${key}',
    _type: '${typeName}',${extra}
    title: '${escapeJs(title)}',
    text: 'Text.',
  },
`
  if (variants.length === 0) {
    return `  // Placeholder from \`npm run new:section\`: fill it in, add a variant per look, then refresh baselines.
${entry(kebab)}`
  }
  return `  // Placeholders from \`npm run new:section\`, one per variant: give them real content, then refresh baselines.
${variants.map((v) => entry(`${kebab}-${v.kebab}`, `\n    variant: '${v.kebab}',`)).join('')}`
}

export function componentTemplate({ typeName, Component }, typesPath = '../../types') {
  return `import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'

import type { SectionProps } from '${typesPath}'

// How this section looks without a style. Keep it equal to the initial style in its schema.
const DEFAULTS: SectionDefaults = { container: 'max-w-content', align: 'start' }

export function ${Component}({ data, isFirst }: SectionProps<'${typeName}'>) {
  const { title, text } = data
  const { text: textAlign } = sectionTraits(data.style, DEFAULTS)

  return (
    <SectionFrame
      style={data.style}
      defaults={DEFAULTS}
      isFirst={isFirst}
      containerClassName={textAlign}
    >
      <h2 className="text-h2 font-semibold text-balance">{title}</h2>
      {text && <p className="mt-4 max-w-measure-narrow text-lead text-pretty text-ink-muted">{text}</p>}
    </SectionFrame>
  )
}
`
}

/** One variant's component: `components/sections/<kebab>/<variant>.tsx`, one level deeper than a plain section. */
export function variantComponentTemplate(names, variant) {
  const component = componentTemplate(names, '../../../types')
  return component.replace(
    `export function ${names.Component}(`,
    `export function ${names.Component}${variant.Component}(`,
  )
}

/** `components/sections/<kebab>/index.tsx`: maps the stored variant to its component. The first is the default. */
export function dispatcherTemplate({ typeName, Component }, variants) {
  const [first, ...rest] = variants
  return `import { stegaClean } from 'next-sanity'

import type { SectionProps } from '../../../types'
${variants
  .map((v) => `import { ${Component}${v.Component} } from './${v.kebab}'`)
  .sort()
  .join('\n')}

/**
 * Every variant renders the same data; the \`variant\` field picks the layout. Content with no
 * variant, or one this deployment doesn't know, gets the default (${first.kebab}).
 */
export function ${Component}(props: SectionProps<'${typeName}'>) {
  switch (stegaClean(props.data.variant)) {
${rest
  .map(
    (v) => `    case '${v.kebab}':
      return <${Component}${v.Component} {...props} />`,
  )
  .join('\n')}
    default:
      return <${Component}${first.Component} {...props} />
  }
}
`
}

function kebabOf(typeName) {
  return typeName.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
}

function escapeJs(text) {
  return text.replace(/['\\]/g, '\\$&')
}
