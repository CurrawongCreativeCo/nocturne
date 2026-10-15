import Link from 'next/link'

import { GALLERY_PATH } from '@/config/paths'

import { ChoiceLink } from './choice-link'
import {
  isCustomised,
  PREVIEW_WIDTHS,
  stateHref,
  withWidth,
  type StyleguideState,
} from '../utils/styleguide-state'

export const TOKENS_PATH = `${GALLERY_PATH}/tokens`

/**
 * The top of the style guide: the two views (sections, tokens) and, on the sections view, the
 * width every section is previewed at. The widths are container widths, not an iframe: see
 * WidthFrame.
 */
export function StyleguideNav({
  view,
  state,
}: {
  view: 'sections' | 'tokens'
  state?: StyleguideState
}) {
  return (
    <nav
      aria-label="Style guide"
      className="flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-line bg-surface px-gutter py-4"
    >
      <p className="text-h4 font-semibold text-ink">Style guide</p>
      <ul className="flex flex-wrap items-center gap-2">
        <li>
          <ChoiceLink href={GALLERY_PATH} current={view === 'sections'}>
            Sections
          </ChoiceLink>
        </li>
        <li>
          <ChoiceLink href={TOKENS_PATH} current={view === 'tokens'}>
            Design tokens
          </ChoiceLink>
        </li>
      </ul>
      {view === 'sections' && state ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span id="styleguide-width" className="text-small text-ink-muted">
              Preview width
            </span>
            <ul aria-labelledby="styleguide-width" className="flex flex-wrap items-center gap-2">
              <li>
                <ChoiceLink href={stateHref(withWidth(state, null))} current={state.width === null}>
                  Full
                </ChoiceLink>
              </li>
              {PREVIEW_WIDTHS.map((width) => (
                <li key={width}>
                  <ChoiceLink
                    href={stateHref(withWidth(state, width))}
                    current={state.width === width}
                  >
                    {width} px
                  </ChoiceLink>
                </li>
              ))}
            </ul>
          </div>
          {isCustomised(state) ? (
            <Link
              href={GALLERY_PATH}
              prefetch={false}
              scroll={false}
              className="text-small font-medium text-accent-text underline underline-offset-4"
            >
              Reset to the page as authored
            </Link>
          ) : null}
        </>
      ) : null}
    </nav>
  )
}
