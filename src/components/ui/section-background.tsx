import { SanityImage } from '@/components/ui/sanity-image'
import { urlFor } from '@/lib/sanity/image'
import { hotspotObjectPosition } from '@/lib/sanity/image-focus'
import {
  overlayGradientCss,
  resolveOverlayGradient,
  stopColourCss,
} from '@/lib/sanity/overlay-gradient'
import { SECTION_OVERLAY_OPACITY, SECTION_WASH_COLOURS } from '@/lib/sanity/section-style-options'

import {
  type ResolvedBackgroundImage,
  type ResolvedSectionStyle,
  type SectionTone,
  resolveBackgroundImage,
} from './section-style'

/** The tone's own background colour, which the overlay lays over the picture (`alt` paints with surface-alt). */
const OVERLAY_CLASS: Record<SectionTone, string> = {
  surface: 'bg-surface',
  alt: 'bg-surface-alt',
  inverse: 'bg-surface',
  accent: 'bg-surface',
}

const DEFAULT_PLACEMENT = resolveBackgroundImage(undefined)

/**
 * Stays put while scrolling: the layer is fixed to the viewport and the layer around it clips it to
 * the section (`clip-path: inset(0)`, set on the wrapper below), because `background-attachment:
 * fixed` does not apply to an image element. Large screens only, and not for visitors who ask for
 * less motion; elsewhere the layer simply scrolls with the section.
 */
const FIXED_LAYER_CLASS = 'lg:motion-safe:fixed'

/**
 * Cover the screen: the gradient, picture and overlay share one window-sized layer fixed to the
 * viewport, so they stay one still surface while the content scrolls, and are never stretched to a
 * long section's height. `lvh` is the window with the browser's toolbars hidden, so no gap opens
 * when a phone's address bar slides away. The section's layer clips it (`[data-screen-backdrop]` in
 * globals.css, which also lets it show past the page's ends on a Minimal page, where iOS Safari's
 * overscroll would otherwise uncover the page's own background).
 */
const SCREEN_LAYER_CLASS = 'fixed inset-x-0 top-0 h-lvh'

type Props = Pick<ResolvedSectionStyle, 'tone' | 'gradient' | 'image' | 'overlay'> & {
  /** Placement, strength and wash; unset is the default picture (fills the section, full strength, background colour). */
  placement?: ResolvedBackgroundImage
  /** The first section holds the page's LCP candidates, so its picture loads at once; others are lazy. */
  isFirst: boolean
}

/**
 * The layers behind a section's content, from back to front: the brand gradient, the picture, then
 * the overlay (the tone's colour at the chosen strength, so the tone's text colours keep their
 * contrast, a light or dark wash, or a see-through gradient of the site's colours). All three are absolutely positioned inside the <section> (which is `relative isolate`),
 * or, for Cover the screen, inside one layer fixed to the window, so they take no space and cannot
 * shift the layout. Purely decorative, hence hidden from assistive
 * technology, and the picture has empty alt text. Renders nothing for a section with neither.
 */
export function SectionBackground({
  tone,
  gradient,
  image,
  overlay,
  placement = DEFAULT_PLACEMENT,
  isFirst,
}: Props) {
  if (!gradient && !image) return null
  const opacity = SECTION_OVERLAY_OPACITY[overlay]
  // A gradient overlay carries its opacity in its stops (at the overlay's strength), so its layer is
  // drawn at full opacity; the other colours are one flat colour at the strength's opacity.
  const overlayGradient =
    placement.wash === 'gradient' && placement.gradient && overlay !== 'none'
      ? overlayGradientCss(resolveOverlayGradient(placement.gradient, overlay), stopColourCss(tone))
      : undefined

  const layers = (
    <>
      {gradient ? (
        <div
          data-section-gradient={gradient}
          className="absolute inset-0"
          // An undefined variable (the gradient was removed from Design settings) draws nothing.
          style={{ backgroundImage: `var(--gradient-${gradient})` }}
        />
      ) : null}
      {image ? (
        <>
          <div
            data-section-image={placement.size}
            data-image-fixed={placement.fixed ? '' : undefined}
            data-image-screen={placement.screen ? '' : undefined}
            // The picture's strength: it lets the section's own background show through.
            style={placement.strength < 1 ? { opacity: placement.strength } : undefined}
            className={`absolute inset-0 ${placement.fixed ? FIXED_LAYER_CLASS : ''}`.trim()}
          >
            <BackgroundPicture image={image} placement={placement} isFirst={isFirst} />
          </div>
          {overlayGradient ? (
            <div
              data-section-overlay={overlay}
              data-overlay-colour="gradient"
              className="absolute inset-0"
              style={{ backgroundImage: overlayGradient }}
            />
          ) : opacity > 0 && placement.wash !== 'gradient' ? (
            <div
              data-section-overlay={overlay}
              data-overlay-colour={placement.wash}
              className={`absolute inset-0 ${placement.wash === 'background' ? OVERLAY_CLASS[tone] : ''}`.trim()}
              style={{
                opacity,
                ...(placement.wash === 'background'
                  ? {}
                  : { backgroundColor: SECTION_WASH_COLOURS[placement.wash] }),
              }}
            />
          ) : null}
        </>
      ) : null}
    </>
  )

  // Cover the screen needs a picture; a gradient alone keeps filling the section.
  if (image && placement.screen) {
    return (
      <div
        aria-hidden="true"
        data-section-background=""
        data-screen-backdrop=""
        className="absolute inset-0 -z-10"
      >
        <div data-screen-layer="" className={SCREEN_LAYER_CLASS}>
          {layers}
        </div>
      </div>
    )
  }

  return (
    <div
      aria-hidden="true"
      data-section-background=""
      className={`absolute inset-0 -z-10 overflow-hidden ${placement.fixed ? '[clip-path:inset(0)]' : ''}`}
    >
      {layers}
    </div>
  )
}

/**
 * The picture itself. Fill the section crops to the hotspot; Show the whole picture fits inside and
 * sits where Position says; Actual size draws it at its own size (a SanityImage at the asset's
 * dimensions, aligned by flex) or, with Repeat, as a CSS background, because an <img> cannot tile.
 */
function BackgroundPicture({
  image,
  placement,
  isFirst,
}: {
  image: NonNullable<Props['image']>
  placement: ResolvedBackgroundImage
  isFirst: boolean
}) {
  if (placement.tiled) {
    const asset = image.asset
    const url = asset
      ? urlFor({
          asset: { _ref: asset._id },
          crop: image.crop ?? undefined,
          hotspot: image.hotspot ?? undefined,
        }).url()
      : undefined
    return (
      <div
        data-section-tile={placement.repeat}
        className="absolute inset-0"
        style={{
          backgroundImage: url ? `url("${url}")` : undefined,
          backgroundRepeat: placement.repeatCss,
          backgroundPosition: placement.position,
        }}
      />
    )
  }

  if (placement.size === 'actual') {
    return (
      <div className={`absolute inset-0 flex overflow-hidden ${placement.alignClass}`}>
        <SanityImage image={image} alt="" preload={isFirst} className="max-w-none shrink-0" />
      </div>
    )
  }

  return (
    <SanityImage
      image={image}
      alt=""
      fill
      preload={isFirst}
      sizes="100vw"
      className={placement.size === 'contain' ? 'object-contain' : 'object-cover'}
      style={{
        objectPosition: placement.position ?? hotspotObjectPosition(image),
      }}
    />
  )
}
