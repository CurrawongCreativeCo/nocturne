import type { SectionProps } from '../../../types'

/** The section's title and intro. Without a title the intro stands alone; without either, nothing. */
export function TeamHeader({
  data,
  classes,
}: {
  data: SectionProps<'team'>['data']
  /** Block and text alignment classes from `sectionTraits`. */
  classes: string
}) {
  const { title, text } = data
  if (!title && !text) return null

  return (
    <div className={`mb-12 max-w-measure-narrow ${classes}`}>
      {title && <h2 className="text-h2 font-semibold text-balance">{title}</h2>}
      {text && (
        <p className={`${title ? 'mt-4' : ''}text-lead text-pretty text-ink-muted`}>{text}</p>
      )}
    </div>
  )
}

/** Names are headings: one level under the section's title, or the section's own level without one. */
export const headingLevelFor = (data: SectionProps<'team'>['data']) => (data.title ? 'h3' : 'h2')
