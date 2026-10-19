import { SanityImage } from '@/components/ui/sanity-image'
import { urlFor } from '@/lib/sanity/image'
import { hotspotObjectPosition } from '@/lib/sanity/image-focus'
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
 * Cover the screen: the picture is a window-sized layer that sticks to the top of the viewport while
 * the section scrolls past, so it is never stretched to a long section's height. `lvh` is the window
 * with the browser's toolbars hidden, so no gap opens when a phone's address bar slides away. The
 * section's layer clips instead of hiding overflow, because `overflow: hidden` would make it the
 * sticky layer's scroll container and the picture would scroll away.
 */
const SCREEN_LAYER_CLASS = 'sticky top-0 h-lvh w-full'

type Props = Pick<ResolvedSectionStyle, 'tone' | 'gradient' | 'image' | 'overlay'> & {
  /** Placement, strength and wash; unset is the default picture (fills the section, full strength, background colour). */
  placement?: ResolvedBackgroundImage
  /** The first section holds the page's LCP candidates, so its picture loads at once; others are lazy. */
  isFirst: boolean
}

/**
 * The layers behind a section's content, from back to front: the brand gradient, the picture, then
 * the overlay (the tone's colour at the chosen strength, so the tone's text colours keep their
 * contrast). All three are absolutely positioned inside the <section> (which is `relative isolate`),
 * so they take no space and cannot shift the layout. Purely decorative, hence hidden from assistive
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

  return (
    <div
      aria-hidden="true"
      data-section-background=""
      className={`absolute inset-0 -z-10 ${placement.screen ? 'overflow-clip' : 'overflow-hidden'} ${placement.fixed ? '[clip-path:inset(0)]' : ''}`}
    >
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
            {placement.screen ? (
              <div className={`relative ${SCREEN_LAYER_CLASS}`}>
                <BackgroundPicture image={image} placement={placement} isFirst={isFirst} />
              </div>
            ) : (
              <BackgroundPicture image={image} placement={placement} isFirst={isFirst} />
            )}
          </div>
          {opacity > 0 ? (
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
