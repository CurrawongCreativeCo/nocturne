import { Children, Fragment, type CSSProperties, type ReactNode } from 'react'

import { LazyFloat } from '@/components/motion/float-lazy'
import { MotionDiv } from '@/components/motion/motion-elements'
import { LazyParallax } from '@/components/motion/parallax-lazy'
import { enterProps, revealChild, type ParallaxPlan } from '@/components/motion/presets'
import { resolveDecorativeMark } from '@/lib/sanity/decorative-mark-options'
import {
  panelChoice,
  panelDomProps,
  pictureOverlay,
  resolveSectionPanel,
} from '@/lib/sanity/section-panel'
import type { SiteDesign } from '@/lib/sanity/site-design'

import { DecorativeMark } from './decorative-mark'
import { SectionBackground } from './section-background'
import {
  closeToBottom,
  closeToTop,
  cutMaskImage,
  edgeBackLine,
  edgeComposition,
  edgeHeightIsCustom,
  edgeHeightStyle,
  edgeLine,
  edgeMaskImage,
  isLineShape,
  type EdgeComposition,
  type EdgePaint,
  type EdgePart,
  type EdgeShadow,
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
 * A composed edge's parts (new shapes only; today's shapes never reach this): each part its own SVG, named
 * by where it is drawn and its order (`data-edge-part`: `under-1`, `line-1`, `over-1`), so its CSS can never
 * match today's back wave or accent line (`data-edge-layer`). A fill covers from its line to the band's far
 * side; a line keeps its width however the band stretches. Over parts sit at -z-10 inside the section: above
 * its background and mark, which come before them, and below its content.
 */
function EdgeParts({
  parts,
  name,
}: {
  parts: readonly EdgePart[]
  name: 'under' | 'line' | 'over'
}) {
  const className = name === 'over' ? `${EDGE_SVG_CLASS} -z-10` : EDGE_SVG_CLASS
  return parts.map((part, index) => {
    const id = `${name}-${String(index + 1)}`
    return (
      <svg
        key={id}
        data-edge-part={id}
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        className={className}
        style={EDGE_SVG_STYLE}
      >
        {part.kind === 'fill' ? (
          <path
            d={part.side === 'over' ? closeToBottom(part.line) : closeToTop(part.line)}
            fill={paintOf(part.paint)}
            fillOpacity={part.opacity}
          />
        ) : (
          <path
            d={part.line}
            fill="none"
            stroke={paintOf(part.paint)}
            strokeOpacity={part.opacity}
            strokeWidth={part.widthPx}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
    )
  })
}

/**
 * A part's colour: a theme role, or Echo, the colour of the section the edge belongs to. Echo is resolved on
 * the frame (`data-edge-echo`, tokens.generated.css), so a part over the next section can't read that
 * section's tone for it.
 */
const paintOf = (paint: EdgePaint) =>
  paint === 'echo' ? 'var(--edge-echo)' : `var(--color-${paint})`

/** A composed edge's over parts, inside the section, where its own mask clips them at the cut. */
function EdgeOverLayers({ parts }: { parts: readonly EdgePart[] }) {
  return <EdgeParts parts={parts} name="over" />
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
export function SectionFrame(props: Props) {
  // Only a section with a panel needs the site's colours and gradients, so only it waits for them. A
  // layout that draws its own surfaces never has one: SectionRenderer leaves its stored choice out
  // (lib/design/section-surfaces.ts).
  if (panelChoice(props.style?.panel)) return <PanelSectionFrame {...props} />
  return <SectionFrameView {...props} />
}

async function PanelSectionFrame(props: Props) {
  // Loaded here, not at the top, so a page without a panel never loads the Sanity client for this.
  const { getSiteDesign } = await import('@/lib/sanity/site-design')
  return <SectionFrameView {...props} design={await getSiteDesign()} />
}

function SectionFrameView({
  design,
  style,
  defaults,
  isFirst = false,
  containerClassName = '',
  className = '',
  background,
  media,
  'aria-labelledby': labelledBy,
  children,
}: Props & { design?: SiteDesign }) {
  const resolved = resolveSectionStyle(style, defaults)
  const plan = sectionMotion(style, defaults, {
    isFirst,
    hasMedia: Boolean(media),
    placement: 'beside',
  })
  // A panel is on the content container, so every section gets it with no code of its own. The same
  // decision the Studio's warning makes (resolveSectionPanel), from the colours and gradients the page
  // really draws; with none (they couldn't be read) a gradient is checked with the conservative bound.
  const panel = resolveSectionPanel({
    panel: style?.panel,
    strength: style?.panelStrength,
    tone: resolved.tone,
    hasPicture: Boolean(resolved.image),
    overlay: pictureOverlay(style, resolved.tone),
    gradient: resolved.gradient,
    gradients: design?.gradients,
    site: design?.colours,
    hasOwnBackground: Boolean(background),
    // Elevated cuts nothing away, so nothing changes under a panel at the section's foot.
    overlaps:
      (Boolean(resolved.edge) && resolved.edge?.shape !== 'elevated') ||
      resolved.motion === 'parallax' ||
      resolved.motion === 'float',
  })
  const panelProps = panel ? panelDomProps(panel) : undefined
  // A mark sits above the background and overlay. With a panel it stays behind the content unless asked
  // to go behind the panel: inside the panel's box, over its fill. The container is only made a stacking
  // layer when there is a mark to lay it over.
  const mark = resolveDecorativeMark(style?.mark)
  const markInPanel = Boolean(panel) && mark?.layer !== 'panel'
  const markProps = {
    input: style?.mark,
    scope: 'section',
    tone: resolved.tone,
    // Only a picture or gradient is unknown behind the text: a panel without one is a known colour.
    backdrop: Boolean(resolved.image ?? resolved.gradient),
  } as const
  const markInContainer = mark && markInPanel ? <DecorativeMark {...markProps} nested /> : null
  const markClass = !mark ? '' : markInPanel ? 'relative isolate' : 'relative'
  const containerClass =
    `${resolved.containerClass} ${containerClassName} ${panelProps?.className ?? ''} ${markClass}`.trim()
  const panelAttributes = panelProps
    ? {
        'data-panel': panelProps.render,
        'data-panel-base': panelProps.base,
        'data-panel-tint': panelProps.tint,
      }
    : undefined
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
  // Only present with a mark: an empty slot would shift every useId below it (the parity snapshots hold this).
  const behind =
    mark && !markInPanel ? (
      <>
        {background}
        <DecorativeMark {...markProps} />
      </>
    ) : (
      background
    )
  // A composed edge is worked out once: the frame draws its under parts, the section its over parts. They
  // join the slot above only when there are some, for the same reason (section-edge-parity.test.tsx).
  const composition = resolved.edge ? edgeComposition(resolved.edge) : undefined
  const overParts = composition?.parts.filter((part) => part.side === 'over') ?? []
  const backLayers =
    overParts.length > 0 ? (
      <>
        {behind}
        <EdgeOverLayers parts={overParts} />
      </>
    ) : (
      behind
    )
  const withMark = (inside: ReactNode) =>
    markInContainer ? (
      <>
        {markInContainer}
        {inside}
      </>
    ) : (
      inside
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
      {backLayers}
      {plan.kind === 'enter' && plan.target === 'container' ? (
        <MotionDiv
          {...enterProps(plan)}
          {...panelAttributes}
          className={containerClass}
          style={panelProps?.style}
        >
          {withMark(content)}
        </MotionDiv>
      ) : plan.kind === 'enter' ? (
        <MotionDiv
          {...enterProps(plan)}
          {...panelAttributes}
          className={containerClass}
          style={panelProps?.style}
        >
          {withMark(
            Children.map(
              [children, mediaNode && <Fragment key="media">{mediaNode}</Fragment>],
              (child) =>
                child ? <MotionDiv {...revealChild(plan.childVariants)}>{child}</MotionDiv> : null,
            ),
          )}
        </MotionDiv>
      ) : (
        <div className={containerClass} style={panelProps?.style} {...panelAttributes}>
          {withMark(content)}
        </div>
      )}
    </section>
  )

  if (!resolved.edge) return section
  if (resolved.edge.shape === 'elevated')
    return <ElevatedFrame shadow={resolved.edge.shadow ?? 'soft'}>{section}</ElevatedFrame>
  return (
    <EdgeFrame edge={resolved.edge} composition={composition} tone={resolved.tone}>
      {section}
    </EdgeFrame>
  )
}

/**
 * Elevated (task 151, Slice 6): a straight boundary that casts a soft shadow onto the section below. The frame
 * lifts the section a step above the sections after it, as an edge's does (globals.css), so the shadow falls on
 * them and stays under the sticky header; the shadow is a strip that starts where the section ends and is
 * painted over what follows. Nothing is masked and no room is reserved: the strip is absolutely placed and
 * takes no part in layout, the section below is not pulled up, and the strip is outside the section, so a
 * section that clips its overflow cannot clip it. It is its own attribute, not the edge frame's, so none of
 * the cut's rules (mask, bottom padding, follower, footer band) reach it.
 */
function ElevatedFrame({ shadow, children }: { shadow: EdgeShadow; children: ReactNode }) {
  return (
    <div data-section-elevated={shadow} className="relative">
      {children}
      <div
        data-edge-shadow=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-full"
      />
    </div>
  )
}

/**
 * A composed edge (new shapes only) takes the branches below that read `composition`: its mask from its cut,
 * its under fills before the section and its under lines after it, and Echo's colour from the section's
 * tone. Today's shapes have no composition, so they take the original branches, unchanged, in the same
 * three slots.
 */
function EdgeFrame({
  edge,
  composition,
  tone,
  children,
}: {
  edge: ResolvedEdge
  composition: EdgeComposition | undefined
  /** The section's tone, whose colour Echo is. */
  tone: string
  children: ReactNode
}) {
  const transform = { flip: edge.flip, invert: edge.invert }
  const accent = edge.accent === 'none' ? undefined : `var(--color-${edge.accent})`
  // Today's shapes are drawn from their line; a new one only from its composition.
  const line = isLineShape(edge.shape) ? edge.shape : undefined
  const echoes = composition?.parts.some((part) => part.paint === 'echo') ?? false
  const under = (kind: EdgePart['kind']) =>
    composition?.parts.filter((part) => part.side === 'under' && part.kind === kind) ?? []

  return (
    <div
      data-section-edge-frame={edge.shape}
      data-edge-custom={edgeHeightIsCustom(edge.height) ? '' : undefined}
      data-edge-echo={echoes ? tone : undefined}
      className="relative"
      style={
        {
          ...edgeHeightStyle(edge.height, '--edge-h'),
          '--edge-mask': composition
            ? cutMaskImage(composition.cut)
            : line && edgeMaskImage(line, transform),
        } as CSSProperties
      }
    >
      {composition ? (
        <EdgeParts parts={under('fill')} name="under" />
      ) : edge.shape === 'layered' ? (
        <EdgeSvg data-edge-layer="back">
          <path
            d={closeToTop(edgeBackLine(transform))}
            fill={`var(--color-${edge.layer})`}
            fillOpacity={0.55}
          />
        </EdgeSvg>
      ) : null}
      {children}
      {composition ? (
        <EdgeParts parts={under('stroke')} name="line" />
      ) : accent && line ? (
        <EdgeSvg data-edge-layer="line">
          <path
            d={edgeLine(line, transform)}
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
