/**
 * The values of a section's shared `style` (schema: schema/section-style.ts). Kept apart from the
 * schema because the site imports them too, and the schema file pulls in the whole Studio package.
 */

export const SECTION_TONES = ['surface', 'alt', 'inverse', 'accent'] as const
export const SECTION_SPACINGS = ['compact', 'default', 'spacious'] as const
export const SECTION_WIDTHS = ['narrow', 'default', 'wide', 'full'] as const
export const SECTION_ALIGNS = ['start', 'center'] as const
/**
 * The animation presets (components/motion/presets.ts holds what each one does). `reveal` is the
 * original "Fade up" and `parallax` the original Parallax (now "Subtle"); their stored names never
 * change, so content saved before the library existed renders as it always did.
 */
export const SECTION_MOTIONS = [
  'none',
  'reveal',
  'subtle',
  'fade',
  'slide',
  'stagger',
  'float',
  'parallax',
  'parallaxMedium',
  'parallaxStrong',
] as const

/** What editors call each animation preset, in the picker and in messages. */
export const SECTION_MOTION_TITLES: Record<(typeof SECTION_MOTIONS)[number], string> = {
  none: 'None',
  reveal: 'Fade up',
  subtle: 'Subtle entrance',
  fade: 'Fade',
  slide: 'Slide in',
  stagger: 'Staggered',
  float: 'Float',
  parallax: 'Parallax · Subtle',
  parallaxMedium: 'Parallax · Medium',
  parallaxStrong: 'Parallax · Strong',
}

/** The Advanced animation options (components/motion/presets.ts says which preset uses which). */
export const MOTION_INTENSITIES = ['subtle', 'normal', 'bold'] as const
export const MOTION_DURATIONS = ['fast', 'normal', 'slow'] as const
export const MOTION_DELAYS = ['none', 'short', 'long'] as const
export const MOTION_DIRECTIONS = ['start', 'end', 'up', 'down'] as const
export const MOTION_TRIGGERS = ['view', 'load'] as const
export const MOTION_EASINGS = ['easeOut', 'easeInOut', 'easeIn', 'linear'] as const

export const MOTION_INTENSITY_TITLES = { subtle: 'Subtle', normal: 'Normal', bold: 'Bold' } as const
export const MOTION_DURATION_TITLES = { fast: 'Fast', normal: 'Normal', slow: 'Slow' } as const
export const MOTION_DELAY_TITLES = { none: 'None', short: 'Short', long: 'Long' } as const
export const MOTION_DIRECTION_TITLES = {
  start: 'From the start',
  end: 'From the end',
  up: 'From below',
  down: 'From above',
} as const
export const MOTION_TRIGGER_TITLES = { view: 'On scroll into view', load: 'On load' } as const
export const MOTION_EASING_TITLES = {
  easeOut: 'Ease out (settles gently)',
  easeInOut: 'Ease in and out',
  easeIn: 'Ease in (speeds up)',
  linear: 'Linear (steady)',
} as const

/**
 * The per-part animation (components/motion/part-motion.ts, README "Animating individual parts"): one
 * preset and one delay per part of a section. `inherit` follows the section's animation; `parallax`
 * is offered only for the parts that are pictures.
 */
export const PART_PRESETS = [
  'inherit',
  'none',
  'fade',
  'rise',
  'reveal',
  'slide',
  'scale',
  'parallax',
] as const
export const PART_DELAYS = ['auto', 'short', 'long'] as const

export const PART_PRESET_TITLES: Record<(typeof PART_PRESETS)[number], string> = {
  inherit: 'Inherit',
  none: 'None',
  fade: 'Fade',
  rise: 'Rise',
  reveal: 'Reveal',
  slide: 'Slide',
  scale: 'Scale',
  parallax: 'Parallax',
}
export const PART_DELAY_TITLES: Record<(typeof PART_DELAYS)[number], string> = {
  auto: 'Auto',
  short: 'Short',
  long: 'Long',
}

/** Bounds for the exact values behind "Custom". The resolver clamps to them, the schema validates against them. */
export const MOTION_CUSTOM = {
  durationMs: { min: 100, max: 3000 },
  /** A float loop is far slower than an entrance. */
  loopMs: { min: 2000, max: 20000 },
  distancePx: { min: 0, max: 120 },
  /** Share of the section that must be on screen before it plays, as a percentage. */
  thresholdPercent: { min: 5, max: 100 },
} as const

/**
 * What editors call each tone: in the Background picker and in list previews ("Hero · Split · Contrast"). Named by
 * role, not colour, because Brand colours can make any of them light or dark (README, "Colour systems").
 */
export const SECTION_TONE_TITLES: Record<(typeof SECTION_TONES)[number], string> = {
  surface: 'Page',
  alt: 'Tinted',
  inverse: 'Contrast',
  accent: 'Brand',
}

/** How strongly the tone's colour covers a background image, so the text on it stays readable. */
export const SECTION_OVERLAYS = ['none', 'light', 'medium', 'strong'] as const

export const SECTION_OVERLAY_TITLES: Record<(typeof SECTION_OVERLAYS)[number], string> = {
  none: 'None',
  light: 'Light',
  medium: 'Medium',
  strong: 'Strong',
}

/** The opacity of the tone-coloured layer over the image: what the page draws and the contrast check measures. */
export const SECTION_OVERLAY_OPACITY: Record<(typeof SECTION_OVERLAYS)[number], number> = {
  none: 0,
  light: 0.45,
  medium: 0.7,
  strong: 0.88,
}

/**
 * How a background image sits in its section (README, "Section backgrounds"). `cover` is today's
 * behaviour and the default: the picture fills the section, the hotspot keeps the subject in view.
 */
export const SECTION_IMAGE_SIZES = ['cover', 'contain', 'actual'] as const
export const SECTION_IMAGE_SIZE_TITLES: Record<(typeof SECTION_IMAGE_SIZES)[number], string> = {
  cover: 'Fill the section',
  contain: 'Show the whole picture',
  actual: 'Actual size',
}

export const SECTION_IMAGE_VERTICALS = ['top', 'middle', 'bottom'] as const
export const SECTION_IMAGE_HORIZONTALS = ['left', 'center', 'right'] as const
export const SECTION_IMAGE_VERTICAL_TITLES: Record<
  (typeof SECTION_IMAGE_VERTICALS)[number],
  string
> = { top: 'Top', middle: 'Middle', bottom: 'Bottom' }
export const SECTION_IMAGE_HORIZONTAL_TITLES: Record<
  (typeof SECTION_IMAGE_HORIZONTALS)[number],
  string
> = { left: 'Left', center: 'Centre', right: 'Right' }

export const SECTION_IMAGE_REPEATS = ['none', 'x', 'y', 'both'] as const
export const SECTION_IMAGE_REPEAT_TITLES: Record<(typeof SECTION_IMAGE_REPEATS)[number], string> = {
  none: 'No repeat',
  x: 'Repeat across',
  y: 'Repeat down',
  both: 'Tile',
}

/** How much of the picture shows through, before the overlay. */
export const SECTION_IMAGE_STRENGTHS = ['full', 'soft', 'faint'] as const
export const SECTION_IMAGE_STRENGTH_TITLES: Record<
  (typeof SECTION_IMAGE_STRENGTHS)[number],
  string
> = { full: 'Full', soft: 'Soft', faint: 'Faint' }
export const SECTION_IMAGE_STRENGTH_OPACITY: Record<
  (typeof SECTION_IMAGE_STRENGTHS)[number],
  number
> = { full: 1, soft: 0.6, faint: 0.3 }
/** The exact strength an editor may type instead, as a percentage. */
export const SECTION_IMAGE_STRENGTH_CUSTOM = { min: 5, max: 100 } as const

/** The picture's opacity, 0 to 1: an exact percentage (kept within its range) wins over the named strength. */
export function imageStrengthOpacity(
  strength: string | null | undefined,
  percent: number | null | undefined,
): number {
  if (typeof percent === 'number' && Number.isFinite(percent)) {
    const { min, max } = SECTION_IMAGE_STRENGTH_CUSTOM
    return Math.min(max, Math.max(min, percent)) / 100
  }
  const named = SECTION_IMAGE_STRENGTHS.find((option) => option === strength)
  return SECTION_IMAGE_STRENGTH_OPACITY[named ?? 'full']
}

/** The overlay's colour: the section's own background (today), or a light or dark wash whatever the tone. */
export const SECTION_WASHES = ['background', 'light', 'dark'] as const
export const SECTION_WASH_TITLES: Record<(typeof SECTION_WASHES)[number], string> = {
  background: 'Background colour',
  light: 'Light wash',
  dark: 'Dark wash',
}
/**
 * The two fixed washes, as plain colours. They stay light or dark whatever the tone or the brand
 * colours are (the point of a wash), so they are not tokens; the values equal the default
 * `surface` and `surface-inverse`, and the contrast check measures these same values.
 */
export const SECTION_WASH_COLOURS = { light: '#ffffff', dark: '#030712' } as const

/** Position and Repeat apply only to some sizes; Fill the section keeps using the hotspot. */
export const imageSizeUsesPosition = (size: string | null | undefined) =>
  size === 'contain' || size === 'actual'
export const imageSizeUsesRepeat = (size: string | null | undefined) => size === 'actual'

/**
 * The overlay an image gets when none is chosen: Medium on the dark tones, where a bright photo
 * would swallow the light text, and Light on the others.
 */
export function defaultOverlayFor(tone: string | null | undefined): 'light' | 'medium' {
  return tone === 'inverse' || tone === 'accent' ? 'medium' : 'light'
}

/**
 * The shape of a section's bottom edge (README, "Section dividers"). The upper section owns the
 * edge: its background is cut to the shape and the section below shows through the cut.
 */
export const SECTION_EDGES = ['none', 'diagonal', 'wave', 'curve', 'arch', 'layered'] as const
export type SectionEdge = (typeof SECTION_EDGES)[number]

export const SECTION_EDGE_TITLES: Record<SectionEdge, string> = {
  none: 'None',
  diagonal: 'Diagonal',
  wave: 'Wave',
  curve: 'Curve',
  arch: 'Arch',
  layered: 'Layered wave',
}

/** Heights are tokens (`edge` in tokens.json), smaller on phones; "custom" is the Advanced override. */
export const SECTION_EDGE_HEIGHTS = ['small', 'medium', 'large'] as const
export const SECTION_EDGE_HEIGHT_TITLES: Record<(typeof SECTION_EDGE_HEIGHTS)[number], string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
}

/** The brand colour of the thin accent line that follows the edge. */
export const SECTION_EDGE_ACCENTS = ['none', 'accent', 'accent-2', 'highlight'] as const
export const SECTION_EDGE_ACCENT_TITLES: Record<(typeof SECTION_EDGE_ACCENTS)[number], string> = {
  none: 'None',
  accent: 'Primary',
  'accent-2': 'Secondary',
  highlight: 'Highlight',
}

/** The colour of the back wave of a layered wave. */
export const SECTION_EDGE_LAYERS = ['accent-2', 'highlight'] as const
export const SECTION_EDGE_LAYER_TITLES: Record<(typeof SECTION_EDGE_LAYERS)[number], string> = {
  'accent-2': 'Secondary',
  highlight: 'Highlight',
}

/** The custom height range, in px, the Advanced fields accept. */
export const EDGE_CUSTOM_MIN = 16
export const EDGE_CUSTOM_MAX = 320

/** Curve and Arch are symmetrical, so mirroring them would change nothing: Flip is not offered. */
export const edgeAllowsFlip = (edge: string | null | undefined) =>
  edge === 'diagonal' || edge === 'wave' || edge === 'layered'

/** A diagonal turned upside down is the same line mirrored, so only the curved shapes offer Invert. */
export const edgeAllowsInvert = (edge: string | null | undefined) =>
  edge === 'wave' || edge === 'curve' || edge === 'arch' || edge === 'layered'

/** Ids the site itself uses (the skip link's target), so an anchor can't collide with them. */
export const RESERVED_ANCHORS: readonly string[] = ['main-content']

export const ANCHOR_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
