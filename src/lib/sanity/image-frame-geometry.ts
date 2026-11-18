import {
  appearanceFromHeroShape,
  aspectValue,
  IMAGE_ARCH_RATIO_TITLES,
  IMAGE_ARCH_RATIOS,
  resolveImageDesign,
  type ImageAppearance,
  type ImageDesignInput,
} from './image-design-options'
import { FOCUS_FRAMES, type FocusFrame } from './image-focus'
import type { Placement } from './image-framing'
import { thumbnailShapes } from './link-thumbnail-framing'
import {
  resolveAvatar,
  resolveProfileImage,
  type ProfileImageDesignInput,
  type ProfileImageSize,
  type ResolvedProfileBorder,
  type ResolvedProfileImage,
} from './profile-image-options'

/**
 * The shapes a picture is drawn in, as data, for "Adjust picture" (features/studio/components/
 * picture-framing) and for the components that draw the picture. Plain TypeScript with no React
 * and no Studio imports. A placement's resolver turns the component's design into descriptors, so
 * the editor's stage and the page come from the same answer and can't drift.
 */
/** `cardTop`: the card's corners at the top only, where a picture fills the top of a card that clips it. */
export type FrameCorner = 'none' | 'card' | 'cardTop' | 'control' | 'rounded' | 'circle' | 'arch'

/**
 * The corner each Image design shape is cut with: the one place FramedImage's clip, a frame that
 * follows the shape (components/ui/image-frames.tsx) and the Studio's "Adjust picture" mask read it.
 * Standard and the older Framed use the site's card corner; Rounded is 24px (1.5rem).
 */
export function appearanceCorner(shape: ImageAppearance): FrameCorner {
  switch (shape) {
    case 'rounded':
    case 'circle':
    case 'arch':
      return shape
    case 'square':
      return 'none'
    default:
      return 'card'
  }
}

/** CSS pixels of the fixed corners (`--radius-card`, `--radius-control`, Tailwind's rounded-3xl). */
export const CORNER_PX = { card: 16, control: 8, rounded: 24 } as const

export type FrameRing = Extract<ResolvedProfileBorder, { kind: 'ring' }>

export interface FrameShape extends Placement {
  /** Shown in "Also shown as: …" when this is not the main shape. */
  label: string
  corner: FrameCorner
  /** How far a decorative frame's artwork insets the picture, as a percentage of each side. */
  insetPct: number
  /** A solid or gradient ring drawn around the picture. */
  ring?: FrameRing
  /** The CDN URL of a decorative frame's artwork, drawn over the picture. */
  frameUrl?: string
  /** The picture's largest drawn width in CSS pixels, for the zoom limit. */
  drawnPx: number
}

/** A frame's picture sits 14% in from each edge (components/ui/profile-image.tsx). */
export const PROFILE_FRAME_INSET_PCT = 14

/** Each size's largest drawn width in CSS pixels: the width asked of the CDN (components/ui/profile-image.tsx) at 1x. */
export const PROFILE_DRAWN_PX: Record<ProfileImageSize, number> = {
  small: 96,
  medium: 128,
  large: 192,
}

/** The shapes a picture is drawn in: the main shape first, then any others. */
export type FrameShapes = [FrameShape, ...FrameShape[]]

/** A Studio form path: strings, indexes and `{ _key }` segments. */
type FormPath = readonly unknown[]

export interface FramingResolver {
  /**
   * Where the design sits, relative to the image field: drop this many segments off its path, then
   * add `field` (or, without one, read the object at the dropped path).
   */
  designPath: { drop: number; field?: string }
  /** The decorative frame document the design points at, if any: the Studio fetches its artwork. */
  frameRef?: (design: unknown) => string | undefined
  /**
   * The main shape first, then any others the picture is also drawn in; none when nothing is
   * cropped. `path` is the image field's own path, for placements that depend on which item it sits in.
   */
  resolve: (design: unknown, frameUrl?: string | null, path?: FormPath) => FrameShape[]
  /**
   * What the field says when `resolve` returns no shape, if not the profile picture's uncropped wording:
   * one note, or one per design (a placement whose reason depends on the section's settings).
   */
  wholeNote?: WholeNote | ((design: unknown) => WholeNote)
  /**
   * A picture drawn as a covering background has no fixed shape to place a crop in: where the design says so, the
   * editor offers Focus mode instead of "Adjust picture" (task 177), which sets only the hotspot and previews it in
   * these frames. Shapes and a focus are exclusive: `resolve` returns none then.
   */
  focus?: (design: unknown) => FocusPlan | undefined
}

/** How a covering background is previewed in Focus mode, and what the editor tells the person. */
export interface FocusPlan {
  frames: readonly FocusFrame[]
  /** What this placement is: "Text over media background". */
  label: string
}

/** The note a resolver gives for this design, if any. */
export function wholeNoteFor(
  resolver: FramingResolver | undefined,
  design: unknown,
): WholeNote | undefined {
  const note = resolver?.wholeNote
  return typeof note === 'function' ? note(design) : note
}

/** The field's line when a picture has no shape to adjust: with a positioning saved, and without. */
export interface WholeNote {
  saved: string
  unsaved: string
}

/**
 * The shape a profile picture is drawn in, or null for "Logo, uncropped", which keeps the upload's
 * own proportions. `ProfileImage` draws from this too, so the page and the editor agree.
 */
export function profileFrameShape(resolved: ResolvedProfileImage): FrameShape | null {
  if (resolved.shape === 'natural') return null
  const frame = resolved.border?.kind === 'frame' ? resolved.border : undefined
  const inset = frame ? PROFILE_FRAME_INSET_PCT : 0
  return {
    label: 'Profile picture',
    aspect: 1,
    corner: resolved.shape === 'circle' ? 'circle' : 'card',
    insetPct: inset,
    ...(resolved.border?.kind === 'ring' && { ring: resolved.border }),
    ...(frame && { frameUrl: frame.url }),
    drawnPx: Math.round(PROFILE_DRAWN_PX[resolved.size] * (1 - (inset * 2) / 100)),
  }
}

/** The Link list's profile picture: Circle or Rounded square, with a ring or an approved frame. */
const linkListProfile: FramingResolver = {
  designPath: { drop: 2, field: 'profileDesign' },
  frameRef: (design) => {
    const reference = design as { border?: unknown; frame?: { _ref?: unknown } } | null | undefined
    return reference?.border === 'frame' && typeof reference.frame?._ref === 'string'
      ? reference.frame._ref
      : undefined
  },
  resolve: (design, frameUrl) => {
    const shape = profileFrameShape(
      resolveProfileImage({
        ...(design as ProfileImageDesignInput | null | undefined),
        frameUrl,
      }),
    )
    // A logo keeps its own proportions, uncropped: nothing to adjust.
    return shape ? [shape] : []
  },
}

interface StoredLinkListSection {
  variant?: string | null
  rowStyle?: string | null
  thumbnailSize?: string | null
  links?: { _key?: string; featured?: boolean | null; visibility?: string | null }[] | null
}

/**
 * A Link list link's thumbnail: the section's layout, row style and Image-focused size say which
 * shape it is drawn in, and the link's own featured flag picks the featured card's 16:9
 * (lib/sanity/link-thumbnail-framing.ts). The section is three segments up: `links[_key].thumbnail`.
 */
const linkListThumbnail: FramingResolver = {
  designPath: { drop: 3 },
  resolve: (design, _frameUrl, path = []) => {
    const section = design as StoredLinkListSection | null | undefined
    const key = (path[path.length - 2] as { _key?: string } | undefined)?._key
    // Only the first ticked, shown link is drawn large (features/pages/utils/link-list.ts, `featuredKey`).
    const large = section?.links?.find((item) => item.featured && item.visibility !== 'hide')
    return thumbnailShapes({
      layout: section?.variant,
      rowStyle: section?.rowStyle,
      thumbnailSize: section?.thumbnailSize,
      featured: Boolean(key) && large?._key === key,
    })
  },
}

interface StoredGallerySection {
  variant?: string | null
  imageDesign?: ImageDesignInput | null
}

/** A Grid or Slider tile's widest drawn width: one of two columns of the 80rem container (columnSizes). */
const GALLERY_TILE_PX = 640

/**
 * A Gallery photo, drawn as a tile (task 177). Grid and Slider cut every tile to the section's Image
 * design: 4:3, or the ratio its shape forces (Circle 1:1, Arch 4:5 or its chosen ratio). Masonry
 * keeps each photo's own proportions, so there is no fixed tile to reposition it within (a crop
 * saved on the photo still applies there), and the lightbox always shows the whole photo. The
 * section is two segments up: `images[_key]`.
 */
const galleryTile: FramingResolver = {
  designPath: { drop: 2 },
  // Masonry draws each photo at its own proportions: nothing to adjust, but a stored crop still trims it.
  wholeNote: {
    saved:
      'Masonry shows each photo at its own proportions, so there’s nothing to adjust here. The saved positioning still applies to this photo.',
    unsaved: 'Masonry shows each photo at its own proportions, so there’s nothing to adjust.',
  },
  resolve: (design) => {
    const section = design as StoredGallerySection | null | undefined
    if (section?.variant === 'masonry') return []
    const { shape, ratio } = resolveImageDesign(section?.imageDesign, { aspect: '4/3' })
    return [
      {
        label: 'Gallery tile',
        aspect: aspectValue(ratio ?? '4/3'),
        corner: appearanceCorner(shape),
        insetPct: 0,
        drawnPx: GALLERY_TILE_PX,
      },
    ]
  },
}

/** The Featured card's picture column: 3fr of 5 across the 80rem container (events/featured.tsx). */
const EVENT_IMAGE_PX = 768

/**
 * An event's picture (task 177): 16:9 wherever it is drawn, and requested from the CDN at 1200 x 675, so
 * the CDN cuts exactly the area this editor shows (`servedRect`). Two masks, both shown in the editor:
 * - the Featured card's default picture fills the top of the card, which clips it, so only its top
 *   corners are rounded (events/featured.tsx: the card's `rounded-card overflow-hidden`);
 * - the event's own page, and a Featured picture inset for its depth, round all four corners
 *   (`rounded-card` on the picture).
 * The List and Agenda layouts draw no picture. The field sits on the event document, so the design path
 * is the document itself, and which mask a visitor sees depends on where the event is shown.
 */
const eventImage: FramingResolver = {
  designPath: { drop: 1 },
  resolve: () => [
    {
      label: 'Featured card',
      aspect: 16 / 9,
      corner: 'cardTop',
      insetPct: 0,
      drawnPx: EVENT_IMAGE_PX,
    },
    {
      label: 'Event page, and a Featured picture with depth',
      aspect: 16 / 9,
      corner: 'card',
      insetPct: 0,
      drawnPx: EVENT_IMAGE_PX,
    },
  ],
}

/** The field's line where a section draws its picture as its background, which covers the section. */
const BACKGROUND_NOTE: WholeNote = {
  saved:
    'In this layout the picture covers the section behind the text, so there’s no fixed shape to adjust here. The saved positioning still applies to it.',
  unsaved:
    'In this layout the picture covers the section behind the text, so there’s no fixed shape to adjust here.',
}

/**
 * A section picture drawn by FramedImage with the section's Image design: the ratio the shape forces,
 * else the layout's own, and the shape's corner, as the page draws it.
 */
function sectionPicture(
  label: string,
  design: ImageDesignInput | null | undefined,
  ratio: '4/3' | '16/9',
  drawnPx: number,
  fallbackShape?: ImageAppearance,
): FrameShape {
  const resolved = resolveImageDesign(design, { aspect: ratio, fallbackShape })
  return {
    label,
    aspect: aspectValue(resolved.ratio ?? ratio),
    corner: appearanceCorner(resolved.shape),
    insetPct: 0,
    drawnPx,
  }
}

interface StoredHeroSection {
  variant?: string | null
  imageShape?: string | null
  imageDesign?: ImageDesignInput | null
}

/**
 * The hero's picture (task 177). Split draws it beside the text, 4:3 or the shape its Image design (or
 * its older "Image shape") forces (hero/split.tsx). Full background and Image with panel draw it behind
 * the text, covering the section: no fixed shape here. Editorial never draws it. The field is on the section.
 */
const heroImage: FramingResolver = {
  designPath: { drop: 1 },
  wholeNote: BACKGROUND_NOTE,
  // Full background and Image with panel cover the section behind the text: Focus mode, not a shape.
  focus: (design) => {
    const variant = (design as StoredHeroSection | null | undefined)?.variant
    return variant === 'overlay' || variant === 'full-bleed'
      ? { frames: FOCUS_FRAMES, label: 'Hero background' }
      : undefined
  },
  resolve: (design) => {
    const section = design as StoredHeroSection | null | undefined
    if (section?.variant !== 'split') return []
    return [
      sectionPicture(
        'Split picture',
        section.imageDesign,
        '4/3',
        // The picture's column at its widest: 60% of the 80rem container.
        768,
        appearanceFromHeroShape(section.imageShape),
      ),
    ]
  },
}

interface StoredMediaTextSection {
  variant?: string | null
  imageDesign?: ImageDesignInput | null
}

/** Image + text's picture: 16:9 when stacked, else 4:3 (media-text.tsx), or the shape's own ratio. */
function mediaTextShapes(design: unknown): FrameShape[] {
  const section = design as StoredMediaTextSection | null | undefined
  // The stored layouts (features/pages/utils/split-layout.ts, which a shared module may not import; a test
  // keeps the two in step): anything but these two is the side-by-side default.
  if (section?.variant === 'overlay') return []
  return section?.variant === 'stacked'
    ? [sectionPicture('Image + text picture', section.imageDesign, '16/9', 1100)]
    : [sectionPicture('Image + text picture', section?.imageDesign, '4/3', 640)]
}

/**
 * Text over media draws the picture as the section's background, covering it under the text: no fixed shape, so
 * only the hotspot applies, as the background's `object-position` (Focus mode). Side and Stacked keep their shapes.
 */
function mediaTextFocus(design: unknown): FocusPlan | undefined {
  const section = design as StoredMediaTextSection | null | undefined
  return section?.variant === 'overlay'
    ? { frames: FOCUS_FRAMES, label: 'Text over media background' }
    : undefined
}

/** Image + text's media slot picture (`slotImage`, allowed only there): the section is three segments up. */
const mediaTextImage: FramingResolver = {
  designPath: { drop: 3 },
  wholeNote: BACKGROUND_NOTE,
  resolve: mediaTextShapes,
  focus: mediaTextFocus,
}

/** Image + text's older picture field, kept for sections saved before the media slot: on the section itself. */
const mediaTextLegacyImage: FramingResolver = {
  designPath: { drop: 1 },
  wholeNote: BACKGROUND_NOTE,
  resolve: mediaTextShapes,
  focus: mediaTextFocus,
}

interface StoredVideoSection {
  variant?: string | null
  source?: string | null
  aspectRatio?: string | null
}

/** The video frame's Shape (features/pages/utils/video-source.ts ASPECT_RATIOS; a test keeps them in step). */
const VIDEO_RATIOS: Record<string, number> = {
  '16:9': 16 / 9,
  '4:3': 4 / 3,
  '1:1': 1,
  '21:9': 21 / 9,
}

/**
 * The video section's poster (task 177, QA-052). Embed with YouTube or Vimeo shows it before play, cut to
 * the frame's Shape (unset 16:9) with the frame's card corners (video-frame.tsx); the player then fills the
 * same box, so framing never resizes it. An uploaded video's own player draws the poster whole, and Ambient
 * draws it behind the words: no fixed shape in either. The field is on the section.
 */
const videoPoster: FramingResolver = {
  designPath: { drop: 1 },
  wholeNote: (design) => {
    const section = design as StoredVideoSection | null | undefined
    return section?.variant === 'ambient'
      ? BACKGROUND_NOTE
      : {
          saved:
            'An uploaded video’s player shows its poster whole, so there’s nothing to adjust here. The saved positioning still applies if you switch to YouTube or Vimeo.',
          unsaved:
            'An uploaded video’s player shows its poster whole, so there’s nothing to adjust here.',
        }
  },
  resolve: (design) => {
    const section = design as StoredVideoSection | null | undefined
    if (section?.variant === 'ambient' || section?.source === 'upload') return []
    return [
      {
        label: 'Poster before play',
        aspect: VIDEO_RATIOS[section?.aspectRatio ?? ''] ?? 16 / 9,
        corner: 'card',
        insetPct: 0,
        drawnPx: 1100,
      },
    ]
  },
}

/** A Team card's picture when the section's Image design shapes it: the card's width less 24px each side (team-card.tsx `px-6`). */
const TEAM_SHAPED_PX = 336

/**
 * A team member's portrait (task 177): one field on the member document, so one stored crop and hotspot serve
 * every place it is drawn, previewed together:
 * - the member's own page: all four card corners (team-member-page.tsx, 800 x 800);
 * - Team grid and slider cards: the portrait fills the top of a card that clips it, so only the top corners round
 *   (team-card.tsx, 600 x 600): the main preview;
 * - the Team list: a small rounded square (ProfileImage, `rounded-card`);
 * - a Team section whose Image design is Rounded, Circle or Arch sits the portrait inside its card in that shape
 *   (Rounded and Circle square, Arch at its chosen ratio: 4:5 unless the section says 3:4 or 2:3). The portrait is
 *   on the member, not the section, so the editor shows each as a labelled outline: an Arch is a narrower cut of the
 *   same area, kept inside the stored crop around the hotspot, which is what the CDN is asked for.
 * Each is requested at its own ratio, so the CDN cuts exactly the area the editor shows for it.
 */
const teamPortrait: FramingResolver = {
  designPath: { drop: 1 },
  resolve: () => [
    { label: 'Team member page', aspect: 1, corner: 'card', insetPct: 0, drawnPx: 384 },
    { label: 'Team grid and slider card', aspect: 1, corner: 'cardTop', insetPct: 0, drawnPx: 384 },
    { label: 'Team list', aspect: 1, corner: 'card', insetPct: 0, drawnPx: 128 },
    {
      label: 'Team card in a Rounded section',
      aspect: 1,
      corner: 'rounded',
      insetPct: 0,
      drawnPx: TEAM_SHAPED_PX,
    },
    {
      label: 'Team card in a Circle section',
      aspect: 1,
      corner: 'circle',
      insetPct: 0,
      drawnPx: TEAM_SHAPED_PX,
    },
    ...IMAGE_ARCH_RATIOS.map((ratio) => ({
      label: `Team card in an Arch section, ${IMAGE_ARCH_RATIO_TITLES[ratio]}`,
      aspect: aspectValue(ratio),
      // With nothing stored the card asks the CDN for a square (600 x 600) and the arch's box centres it.
      defaultAspect: 1,
      corner: 'arch' as const,
      insetPct: 0,
      drawnPx: TEAM_SHAPED_PX,
    })),
  ],
}

/** The testimonials avatar's drawn widths (quote-card.tsx AVATAR_SCALE): 40, 48 or 64px. */
const AVATAR_DRAWN_PX = { small: 40, medium: 48, large: 64 } as const

/**
 * A testimonial's avatar (task 177): the section's Avatar design (a circle by default, a ring or not)
 * through the same ProfileImage geometry the card draws (`resolveAvatar`, `profileFrameShape`), at the
 * avatar's own size. The avatar is in `items[_key].avatar`, so the section is three segments up.
 */
const testimonialAvatar: FramingResolver = {
  designPath: { drop: 3, field: 'avatarDesign' },
  resolve: (design) => {
    const resolved = resolveAvatar(design as Parameters<typeof resolveAvatar>[0], 'circle')
    const shape = profileFrameShape(resolved)
    return shape ? [{ ...shape, label: 'Avatar', drawnPx: AVATAR_DRAWN_PX[resolved.size] }] : []
  },
}

interface StoredSectionStyle {
  imageSize?: string | null
}

/**
 * A section's Background image (task 177), on the section style every section shares. Fill the section and Cover
 * the screen draw it covering their box, so only the hotspot applies, as `object-position` (Focus mode). Show the
 * whole picture and Actual size are placed by the Position setting (and Repeat tiles it), which the hotspot doesn't
 * move, so the field says so and keeps what is saved. The field is in the style object, one segment up.
 */
const sectionBackground: FramingResolver = {
  designPath: { drop: 1 },
  wholeNote: (design) => {
    const size = (design as StoredSectionStyle | null | undefined)?.imageSize
    const placed =
      size === 'contain'
        ? 'Show the whole picture is placed by Position'
        : 'Actual size is placed by Position and Repeat'
    return {
      saved: `${placed}, so a focus isn’t used here. The saved focus is kept and applies again with Fill the section or Cover the screen.`,
      unsaved: `${placed}, so there’s no focus to set here. Choose Fill the section or Cover the screen to set one.`,
    }
  },
  focus: (design) => {
    const size = (design as StoredSectionStyle | null | undefined)?.imageSize
    return size === 'contain' || size === 'actual'
      ? undefined
      : { frames: FOCUS_FRAMES, label: 'Section background' }
  },
  resolve: () => [],
}

/** Registry keys, set on an image field with `framing('…')` (lib/sanity/schema/image-framing-option.ts). */
export const FRAMING_RESOLVERS = {
  linkListProfile,
  linkListThumbnail,
  galleryTile,
  eventImage,
  heroImage,
  mediaTextImage,
  mediaTextLegacyImage,
  videoPoster,
  teamPortrait,
  testimonialAvatar,
  sectionBackground,
  // new-framing: resolver
} satisfies Record<string, FramingResolver>

export type FramingKey = keyof typeof FRAMING_RESOLVERS

export function isFramingKey(key: unknown): key is FramingKey {
  return typeof key === 'string' && Object.hasOwn(FRAMING_RESOLVERS, key)
}
