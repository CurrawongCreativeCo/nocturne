/**
 * The files `npm run new:section` writes for a new section. Pure string builders, so
 * section-templates.test.mjs can check that a new section starts with the shared Design options:
 * the Design field group and `style` field (schema), `style { ${sectionStyleFields} }` (GROQ) and a
 * SectionFrame (component).
 */

export function schemaTemplate({ typeName, title }) {
  return `import { BlockElementIcon } from '@sanity/icons/BlockElement'
import { defineField, defineType } from 'sanity'

import { accessField } from '@/lib/sanity/schema/access-field'
import { sectionFields, sectionGroups } from '@/lib/sanity/schema/section-style'

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
      accessField,
    ],
    // How this section starts when added. Keep it equal to DEFAULTS in the component.
    { align: 'start' },
  ),
  preview: {
    select: { title: 'title' },
    prepare: ({ title }: { title?: string }) => ({ title: title || 'Untitled', subtitle: '${title}' }),
  },
})
`
}

export function fragmentTemplate({ typeName }) {
  return `export const ${typeName}Fragment = /* groq */ \`
  _type == "${typeName}" && (access != "members" || $members) => {
    style { \${sectionStyleFields} },
    title,
    text
  }
\`

`
}

export function galleryTemplate({ kebab, typeName, title }) {
  return `  // Placeholder from \`npm run new:section\`: fill it in, add a variant per look, then refresh baselines.
  {
    _key: '${kebab}',
    _type: '${typeName}',
    title: '${escapeJs(title)}',
    text: 'Text.',
  },
`
}

export function componentTemplate({ typeName, Component }) {
  return `import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'

import type { SectionProps } from '../../types'

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

function escapeJs(text) {
  return text.replace(/['\\]/g, '\\$&')
}
