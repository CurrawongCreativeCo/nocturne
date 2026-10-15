import { ChoiceLink } from './choice-link'
import { stateHref, withLayout, withTone, type StyleguideState } from '../utils/styleguide-state'

interface Option {
  value: string
  title: string
}

/**
 * Tone and layout choices for one section. "As authored" is the content's own choice and the
 * default, so a view with nothing chosen renders exactly what the page does. A group is left out
 * when the section has nothing to choose there (no layouts, no tone), so every link is a real,
 * sensible combination.
 */
export function SectionControls({
  sectionKey,
  label,
  state,
  tones,
  layouts,
}: {
  sectionKey: string
  label: string
  state: StyleguideState
  tones: readonly Option[] | null
  layouts: { label: string; options: readonly Option[] } | null
}) {
  if (!tones && !layouts) return null
  const tone = state.tones[sectionKey] ?? null
  const layout = state.layouts[sectionKey] ?? null
  const toneId = `tone-${sectionKey}`
  const layoutId = `layout-${sectionKey}`

  return (
    <nav
      aria-label={`Preview options for ${label}`}
      data-styleguide-controls=""
      className="flex flex-wrap items-center gap-x-8 gap-y-2 border-y border-line bg-surface-alt px-gutter py-2"
    >
      {tones ? (
        <div className="flex flex-wrap items-center gap-2">
          <span id={toneId} className="text-small text-ink-muted">
            Tone
          </span>
          <ul aria-labelledby={toneId} className="flex flex-wrap gap-2">
            <li>
              <ChoiceLink
                href={stateHref(withTone(state, sectionKey, null))}
                current={tone === null}
              >
                As authored
              </ChoiceLink>
            </li>
            {tones.map((option) => (
              <li key={option.value}>
                <ChoiceLink
                  href={stateHref(withTone(state, sectionKey, option.value))}
                  current={tone === option.value}
                >
                  {option.title}
                </ChoiceLink>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {layouts ? (
        <div className="flex flex-wrap items-center gap-2">
          <span id={layoutId} className="text-small text-ink-muted">
            {layouts.label}
          </span>
          <ul aria-labelledby={layoutId} className="flex flex-wrap gap-2">
            <li>
              <ChoiceLink
                href={stateHref(withLayout(state, sectionKey, null))}
                current={layout === null}
              >
                As authored
              </ChoiceLink>
            </li>
            {layouts.options.map((option) => (
              <li key={option.value}>
                <ChoiceLink
                  href={stateHref(withLayout(state, sectionKey, option.value))}
                  current={layout === option.value}
                >
                  {option.title}
                </ChoiceLink>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </nav>
  )
}
