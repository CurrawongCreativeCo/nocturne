import { Children, Fragment, type ReactNode } from 'react'

import { MotionDiv } from '@/components/motion/motion-elements'
import { LazyParallax } from '@/components/motion/parallax-lazy'
import { fadeUp, revealChild, revealInView, staggerContainer } from '@/components/motion/presets'

import { resolveSectionStyle, type SectionDefaults, type SectionStyleInput } from './section-style'

/** Gentle: the picture drifts a few percent of its height, not enough to pull the eye from the text. */
const MEDIA_PARALLAX_SPEED = 0.15

interface Props {
  /** The section's `style` as the query returns it. */
  style: SectionStyleInput | null | undefined
  /** How this kind of section looks without a style. Keep it equal to its schema's initial style. */
  defaults?: SectionDefaults
  /** The first section holds the page's <h1> and LCP image, so it never waits for an animation. */
  isFirst?: boolean
  /** Extra classes for the content container, e.g. the grid a media section lays out. */
  containerClassName?: string
  /** Extra classes for the <section>, e.g. `overflow-hidden`. */
  className?: string
  /** Drawn behind the content, directly inside the <section> (a hero's background image). */
  background?: ReactNode
  /**
   * The section's picture, when it has one beside its text: rendered after `children`. With the
   * `parallax` preset it drifts gently as the page scrolls; other presets treat it like any child.
   */
  media?: ReactNode
  'aria-labelledby'?: string
  children: ReactNode
}

/**
 * The <section> every page-builder section renders inside: tone (`data-tone`, which recolours
 * everything within, see tokens.generated.css), spacing, width, the anchor `id` and the motion
 * preset, all from the section's shared `style`. A section supplies only its content.
 *
 * Motion plays once when the content scrolls into view. `reveal` fades the container up, `stagger`
 * fades its direct children up one after another, `parallax` gives the `media` slot a gentle
 * Parallax (a section with no media stays still; a hero draws its own, see ParallaxImage). Content stays visible without JavaScript (globals.css, `[data-reveal]`).
 */
export function SectionFrame({
  style,
  defaults,
  isFirst = false,
  containerClassName = '',
  className = '',
  background,
  media,
  'aria-labelledby': labelledBy,
  children,
}: Props) {
  const resolved = resolveSectionStyle(style, defaults)
  const motion = isFirst ? 'none' : resolved.motion
  const containerClass = `${resolved.containerClass} ${containerClassName}`.trim()
  const mediaNode =
    media && motion === 'parallax' ? (
      <LazyParallax speed={MEDIA_PARALLAX_SPEED}>{media}</LazyParallax>
    ) : (
      media
    )
  const content = (
    <>
      {children}
      {mediaNode}
    </>
  )

  return (
    <section
      id={resolved.anchorId}
      data-tone={resolved.tone}
      aria-labelledby={labelledBy}
      className={`${resolved.sectionClass} ${className}`.trim()}
    >
      {background}
      {motion === 'reveal' ? (
        <MotionDiv {...revealInView(fadeUp)} className={containerClass}>
          {content}
        </MotionDiv>
      ) : motion === 'stagger' ? (
        <MotionDiv {...revealInView(staggerContainer)} className={containerClass}>
          {Children.map(
            [children, mediaNode && <Fragment key="media">{mediaNode}</Fragment>],
            (child) => (child ? <MotionDiv {...revealChild()}>{child}</MotionDiv> : null),
          )}
        </MotionDiv>
      ) : (
        <div className={containerClass}>{content}</div>
      )}
    </section>
  )
}
