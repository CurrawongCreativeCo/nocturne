/**
 * The files `npm run new:section` writes for a new section. Pure string builders, so
 * section-templates.test.mjs can check that a new section starts with the shared Design options:
 * the Design field group and `style` field (schema), `style { ${sectionStyleFields} }` (GROQ) and a
 * SectionFrame (component).
 */

export function schemaTemplate({ typeName, title }, variants = []) {
  const hasVariants = variants.length > 0
  const constName = `${typeName.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}_VARIANTS`
  return `import { BlockElementIcon } from '@sanity/icons/BlockElement'
import { defineField, defineType } from 'sanity'

import { accessField } from '@/lib/sanity/schema/access-field'
import { sectionFields, sectionGroups } from '@/lib/sanity/schema/section-style'${
    hasVariants
      ? `
import { variantField, variantSubtitle } from '@/lib/sanity/schema/section-variant'

/**
 * One component per variant in components/sections/${kebabOf(typeName)}/. The first is the default: what
 * content without a variant renders. At most four per section.
 */
export const ${constName} = [
${variants.map((v) => `  { value: '${v.kebab}', title: '${escapeJs(v.title)}' },`).join('\n')}
] as const`
      : ''
  }

export const ${typeName} = defineType({
  name: '${typeName}',
  title: '${title}',
  type: 'object',
  icon: BlockElementIcon,
  // Content, plus the Design tab (the shared \`style\` field that sectionFields adds).
  groups: sectionGroups,
  fields: sectionFields(
    [
      defineField({ name: 'title', type: 'string', validation: (rule) => rule.required() }),
      defineField({ name: 'text', type: 'text', rows: 3 }),
      accessField,${hasVariants ? `\n      variantField(${constName}),` : ''}
    ],
    // How this section starts when added. Keep it equal to DEFAULTS in the component.
    { align: 'start' },
  ),
  preview: {
    select: { title: 'title'${hasVariants ? ", variant: 'variant'" : ''} },
    prepare: ({ title${hasVariants ? ', variant' : ''} }: { title?: string${hasVariants ? '; variant?: string' : ''} }) => ({
      title: title || 'Untitled',
      subtitle: ${hasVariants ? `variantSubtitle('${escapeJs(title)}', ${constName}, variant)` : `'${title}'`},
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
