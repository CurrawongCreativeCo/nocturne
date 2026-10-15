import { Children, Fragment, type CSSProperties, type ReactNode } from 'react'

import { MotionDiv } from '@/components/motion/motion-elements'
import { LazyParallax } from '@/components/motion/parallax-lazy'
import { fadeUp, revealChild, revealInView, staggerContainer } from '@/components/motion/presets'

import { SectionBackground } from './section-background'
import {
  closeToTop,
  edgeBackLine,
  edgeHeightIsCustom,
  edgeHeightStyle,
  edgeLine,
  edgeMaskImage,
  type ResolvedEdge,
} from './section-edges'
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
 * The decorative SVGs of an edge sit over the next section, in the band the cut leaves. Stretched
 * to the band (`preserveAspectRatio="none"`), with strokes that keep their width however it stretches.
 */
const EDGE_SVG_CLASS = 'pointer-events-none absolute inset-x-0 bottom-0 w-full overflow-visible'
const EDGE_SVG_STYLE = { height: 'var(--edge-h)' } as const

function EdgeSvg({ children, ...rest }: { children: ReactNode; 'data-edge-layer': string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      className={EDGE_SVG_CLASS}
      style={EDGE_SVG_STYLE}
      {...rest}
    >
      {children}
    </svg>
  )
}

/**
 * The <section> every page-builder section renders inside: tone (`data-tone`, which recolours
 * everything within, see tokens.generated.css), spacing, width, the anchor `id` and the motion
 * preset, all from the section's shared `style`. A section supplies only its content.
 *
 * Motion plays once when the content scrolls into view. `reveal` fades the container up, `stagger`
 * fades its direct children up one after another, `parallax` gives the `media` slot a gentle
 * Parallax (a section with no media stays still; a hero draws its own, see ParallaxImage). Content stays visible without JavaScript (globals.css, `[data-reveal]`).
 *
 * The style's brand gradient and background picture (with its overlay) are drawn first, behind
 * everything, by SectionBackground; the hero's own `background` goes above them.
 *
 * A section with a bottom edge (section dividers) is wrapped in a frame that lifts it above the next
 * section; globals.css cuts the section to the shape with a mask. The wrapper also holds the two
 * pictures that can't be inside the mask: a layered wave's back wave (under the section, showing
 * through the cut) and the accent line (over it).
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

  const section = (
    <section
      id={resolved.anchorId}
      data-tone={resolved.tone}
      data-spacing={resolved.spacing}
      aria-labelledby={labelledBy}
      className={`${resolved.sectionClass} ${className}`.trim()}
    >
      <SectionBackground
        tone={resolved.tone}
        gradient={resolved.gradient}
        image={resolved.image}
        overlay={resolved.overlay}
        isFirst={isFirst}
      />
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

  return resolved.edge ? <EdgeFrame edge={resolved.edge}>{section}</EdgeFrame> : section
}

function EdgeFrame({ edge, children }: { edge: ResolvedEdge; children: ReactNode }) {
  const transform = { flip: edge.flip, invert: edge.invert }
  const accent = edge.accent === 'none' ? undefined : `var(--color-${edge.accent})`

  return (
    <div
      data-section-edge-frame={edge.shape}
      data-edge-custom={edgeHeightIsCustom(edge.height) ? '' : undefined}
      className="relative"
      style={
        {
          ...edgeHeightStyle(edge.height, '--edge-h'),
          '--edge-mask': edgeMaskImage(edge.shape, transform),
        } as CSSProperties
      }
    >
      {edge.shape === 'layered' ? (
        <EdgeSvg data-edge-layer="back">
          <path
            d={closeToTop(edgeBackLine(transform))}
            fill={`var(--color-${edge.layer})`}
            fillOpacity={0.55}
          />
        </EdgeSvg>
      ) : null}
      {children}
      {accent ? (
        <EdgeSvg data-edge-layer="line">
          <path
            d={edgeLine(edge.shape, transform)}
            fill="none"
            stroke={accent}
            strokeWidth={3}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </EdgeSvg>
      ) : null}
    </div>
  )
}
