import { Children, Fragment, type CSSProperties, type ReactNode } from 'react'

import { LazyFloat } from '@/components/motion/float-lazy'
import { MotionDiv } from '@/components/motion/motion-elements'
import { LazyParallax } from '@/components/motion/parallax-lazy'
import { enterProps, revealChild, type ParallaxPlan } from '@/components/motion/presets'

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
import {
  resolveSectionStyle,
  sectionMotion,
  type SectionDefaults,
  type SectionStyleInput,
} from './section-style'

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
   * `parallax` preset the whole node drifts gently as the page scrolls; other presets treat it like
   * any child.
   *
   * A function takes over the parallax: it is called with the section's Parallax plan (undefined for any
   * other preset) and moves only the picture inside its still frame, as FramedImage does, so the frame
   * itself never drifts.
   */
  media?: ReactNode | ((parallax: ParallaxPlan | undefined) => ReactNode)
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
 * Motion is the section's animation preset, resolved by `resolveMotion` (components/motion/presets.ts,
 * README "Section animation"). An entrance plays once as the content scrolls into view (or on load):
 * it moves the container, or, staggered, its direct children one after another. Float and the
 * Parallax strengths move the `media` slot (a section with no media stays still; a hero draws its
 * own, see HeroBackground). Content stays visible without JavaScript (globals.css, `[data-reveal]`).
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
  const plan = sectionMotion(style, defaults, {
    isFirst,
    hasMedia: Boolean(media),
    placement: 'beside',
  })
  const containerClass = `${resolved.containerClass} ${containerClassName}`.trim()
  const mediaNode =
    typeof media === 'function' ? (
      plan.kind === 'float' ? (
        <LazyFloat distancePx={plan.distancePx} durationMs={plan.durationMs}>
          {media(undefined)}
        </LazyFloat>
      ) : (
        media(plan.kind === 'parallax' ? plan : undefined)
      )
    ) : media && plan.kind === 'parallax' ? (
      <LazyParallax speed={plan.speed} from={plan.from}>
        {media}
      </LazyParallax>
    ) : media && plan.kind === 'float' ? (
      <LazyFloat distancePx={plan.distancePx} durationMs={plan.durationMs}>
        {media}
      </LazyFloat>
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
        placement={resolved.backgroundImage}
        isFirst={isFirst}
      />
      {background}
      {plan.kind === 'enter' && plan.target === 'container' ? (
        <MotionDiv {...enterProps(plan)} className={containerClass}>
          {content}
        </MotionDiv>
      ) : plan.kind === 'enter' ? (
        <MotionDiv {...enterProps(plan)} className={containerClass}>
          {Children.map(
            [children, mediaNode && <Fragment key="media">{mediaNode}</Fragment>],
            (child) =>
              child ? <MotionDiv {...revealChild(plan.childVariants)}>{child}</MotionDiv> : null,
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
