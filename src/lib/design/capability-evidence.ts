import type { CapabilityId, ContentSourceId, Scope } from './capabilities'

/**
 * Evidence (task 275; README, "Design capability contract"): each registered adoption of a design
 * capability or content source by a component. Site-safe data only.
 *
 * An entry claims nothing by itself. A layout is verified only when all four hold:
 *   1. the schema offers the marked `field` for that layout and state (schema-capabilities.ts);
 *   2. the component's declared policy applies there;
 *   3. this entry registers a render `target` for it;
 *   4. its probe case passes: one shared harness renders the component with `base`, then with
 *      `base` and `probe`, and the target must exist both times, keep its committed snapshot with
 *      the capability unset, and change with the probe (src/app/design-capability-evidence.test.tsx).
 * A missing or unchanged target fails the case, so the claim can't stand.
 */

/** Stored values by dotted path (`links.0.design.border`). `null` removes the value: unset. */
export type Patch = Readonly<Record<string, unknown>>

interface EvidenceBase {
  /** Stable and unique: names the harness case (`linkList.surface.card@stacked`). */
  id: string
  component: string
  /** The layouts it covers. Required for a component with layouts; each one is its own case. */
  layouts?: readonly string[]
  /** The schema field the probe sets, as a manifest path (`style.panel`, `links[].design.border`). */
  field: string
  /**
   * The resolvers the renderer reaches the target through, each checked to exist. The harness
   * disconnects them all at once (replaying what they returned with the field unset), and the probe
   * must then stop changing the target: the claim is the whole path, not just an export that exists.
   */
  resolvers: readonly { module: string; export: string }[]
  /** The file or folder that draws the target, checked to exist. */
  render: string
  /** Stored values both renders start from. `$picture` stands for the fixtures' picture. */
  base?: Patch
  /** What the probe sets on top of `base`. */
  probe: Patch
}

export interface CapabilityEvidence extends EvidenceBase {
  capability: CapabilityId
  scope: Scope
  part?: string
  /** A CSS selector into the component's output: the element the capability renders on. */
  target: string
  /**
   * What the probe must do to the target: change its own attributes, change anything inside it, or draw
   * it (`appears`: the element is absent with the field unset).
   */
  change: 'attributes' | 'content' | 'appears'
}

/** Test cases written for one content source, by file and by name. */
export interface SourceTests {
  file: string
  /** Each is the title (or the start of the title) of a test in the file. */
  cases: readonly string[]
}

/**
 * A content source's evidence. The whole-component probe proves nothing about one source of several,
 * so a source is verified by tests written for it (`tests`): what it draws from what is stored, what it
 * draws nothing without, and that disconnecting its own resolver removes it. The harness checks the
 * named cases exist and aren't skipped; `npm run check` runs them.
 */
export interface SourceEvidence extends EvidenceBase {
  source: ContentSourceId
  tests: readonly SourceTests[]
}

export type Evidence = CapabilityEvidence | SourceEvidence

export const isCapabilityEvidence = (entry: Evidence): entry is CapabilityEvidence =>
  'capability' in entry

/** The fixtures' picture, filled in by the harness. */
export const PICTURE = {
  _type: 'image',
  alt: 'Fixture picture',
  asset: { _type: 'reference', _ref: '$picture' },
} as const

const CROPPED = { _type: 'sanity.imageCrop', top: 0.2, bottom: 0.2, left: 0.2, right: 0.2 }

// ---------------------------------------------------------------------------------------------------
// The shared section style, drawn by SectionFrame

const SECTION_CONTAINER = 'section > :last-child'

type FrameCapability = 'overlay' | 'glass' | 'edge' | 'motion'

const FRAME: Record<FrameCapability, Omit<CapabilityEvidence, 'id' | 'component' | 'layouts'>> = {
  overlay: {
    capability: 'overlay',
    scope: 'section',
    field: 'style.overlay',
    resolvers: [{ module: '@/components/ui/section-style', export: 'resolveSectionStyle' }],
    render: 'src/components/ui/section-background.tsx',
    target: '[data-section-background]',
    change: 'content',
    base: { 'style.image': PICTURE },
    probe: { 'style.overlay': 'strong' },
  },
  glass: {
    capability: 'glass',
    scope: 'section',
    field: 'style.panel',
    resolvers: [{ module: '@/lib/sanity/section-panel', export: 'resolveSectionPanel' }],
    render: 'src/components/ui/section-frame.tsx',
    target: SECTION_CONTAINER,
    change: 'attributes',
    probe: { 'style.panel': 'solid' },
  },
  edge: {
    capability: 'edge',
    scope: 'section',
    field: 'style.edge',
    // SectionFrame draws the edge's frame from the resolved style; SectionRenderer pulls the next
    // section up under it through resolveEdge.
    resolvers: [
      { module: '@/components/ui/section-style', export: 'resolveSectionStyle' },
      { module: '@/components/ui/section-style', export: 'resolveEdge' },
    ],
    render: 'src/components/ui/section-frame.tsx',
    // The element directly around the section: the edge's frame once there is one.
    target: ':has(> section)',
    change: 'attributes',
    probe: { 'style.edge': 'wave' },
  },
  motion: {
    capability: 'motion',
    scope: 'section',
    field: 'style.motion',
    resolvers: [{ module: '@/components/ui/section-style', export: 'sectionMotion' }],
    render: 'src/components/ui/section-frame.tsx',
    target: SECTION_CONTAINER,
    change: 'content',
    // Unlike every section's own default (Fade up, Staggered or None).
    probe: { 'style.motion': 'fade' },
  },
}

/** The section style's capabilities on one component, for the layouts each covers. */
function frameEvidence(
  component: string,
  covers: Partial<Record<FrameCapability, readonly string[] | true>>,
): CapabilityEvidence[] {
  return (Object.entries(covers) as [FrameCapability, readonly string[] | true][]).map(
    ([capability, layouts]) => ({
      id: `${component}.${capability}.section`,
      component,
      ...(layouts === true ? {} : { layouts }),
      ...FRAME[capability],
    }),
  )
}

// ---------------------------------------------------------------------------------------------------
// Slots

const STATS_BAR = [
  {
    _key: 'probe-stats',
    _type: 'statsBar',
    items: [
      { _key: 's1', _type: 'statItem', value: '12', label: 'Years' },
      { _key: 's2', _type: 'statItem', value: '300', label: 'Clients' },
    ],
  },
]
const SLOT_VIDEO = [
  {
    _key: 'probe-video',
    _type: 'slotVideo',
    title: 'Fixture video',
    source: 'youtube',
    url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    poster: PICTURE,
  },
]
const SLOT_IMAGE = [{ _key: 'probe-image', _type: 'slotImage', image: PICTURE }]

// ---------------------------------------------------------------------------------------------------
// The Link list

const LINK_LIST = 'src/features/pages/components/sections/link-list'
// Every link item (the list's other <ul>s hold categories and social icons).
const LINK_ITEMS = 'li[data-track-event="link_click"]'

const link = (key: string, thumbnail: boolean) => ({
  _key: key,
  _type: 'linkListItem',
  eyebrow: 'Eyebrow',
  label: 'Fixture link',
  description: 'A short description.',
  icon: 'phone',
  link: { _type: 'link', linkType: 'external', url: `https://example.com/${key}` },
  ...(thumbnail ? { thumbnail: PICTURE } : {}),
})

/** A profile, social links and two links, with thumbnails (or without, so icons show). */
const linkListContent = (thumbnails: boolean): Patch => ({
  profile: {
    name: 'Fixture name',
    bio: 'A short bio.',
    categories: ['One', 'Two'],
    image: PICTURE,
  },
  socialSource: 'custom',
  socialLinks: [
    { _key: 's1', _type: 'socialLink', platform: 'instagram', url: 'https://instagram.com/x' },
  ],
  links: [link('l1', thumbnails), link('l2', thumbnails)],
})
const CUSTOMISED = { 'links.0.design.appearance': 'custom' }

const WITH_CARDS = ['stacked', 'cards', 'compact']
const WITH_ARROWS = ['stacked', 'cards', 'editorial']
const ALL_LINK_LIST = ['stacked', 'cards', 'editorial', 'compact']

// Glass rows draw today (glass-row.tsx), but `rowStyle` is set inline rather than by a shared glass
// builder, so it carries no glass marker and its evidence would be refused: the pair stays pending
// until task 159's single glass system.
const linkListEvidence: CapabilityEvidence[] = [
  {
    id: 'linkList.surface.card',
    component: 'linkList',
    capability: 'surface',
    scope: 'card',
    layouts: WITH_CARDS,
    field: 'cardDesign.border',
    resolvers: [{ module: '@/lib/sanity/surface-options', export: 'ringSurfaceLook' }],
    render: LINK_LIST,
    target: LINK_ITEMS,
    change: 'content',
    base: linkListContent(true),
    probe: { 'cardDesign.border': 'thick' },
  },
  {
    id: 'linkList.surface.item',
    component: 'linkList',
    capability: 'surface',
    scope: 'item',
    layouts: WITH_CARDS,
    field: 'links[].design.border',
    resolvers: [{ module: '@/lib/sanity/surface-options', export: 'ringSurfaceLook' }],
    render: LINK_LIST,
    target: LINK_ITEMS,
    change: 'content',
    base: { ...linkListContent(true), ...CUSTOMISED },
    probe: { 'links.0.design.border': 'thick' },
  },
  {
    id: 'linkList.text.card',
    component: 'linkList',
    capability: 'text',
    scope: 'card',
    layouts: ALL_LINK_LIST,
    field: 'cardDesign.label',
    resolvers: [{ module: '@/lib/sanity/text-style-options', export: 'textLook' }],
    render: LINK_LIST,
    target: LINK_ITEMS,
    change: 'content',
    base: linkListContent(true),
    probe: { 'cardDesign.label.size': 'large' },
  },
  {
    id: 'linkList.text.item',
    component: 'linkList',
    capability: 'text',
    scope: 'item',
    layouts: ALL_LINK_LIST,
    field: 'links[].design.label',
    resolvers: [{ module: '@/lib/sanity/text-style-options', export: 'textLook' }],
    render: LINK_LIST,
    target: LINK_ITEMS,
    change: 'content',
    base: { ...linkListContent(true), ...CUSTOMISED },
    probe: { 'links.0.design.label.size': 'large' },
  },
  {
    id: 'linkList.icon.card',
    component: 'linkList',
    capability: 'icon',
    scope: 'card',
    layouts: WITH_CARDS,
    field: 'linkDesign.iconShape',
    resolvers: [{ module: '@/lib/sanity/surface-options', export: 'iconLook' }],
    render: LINK_LIST,
    target: LINK_ITEMS,
    change: 'content',
    base: linkListContent(false),
    probe: { 'linkDesign.iconShape': 'circle' },
  },
  {
    id: 'linkList.icon.item',
    component: 'linkList',
    capability: 'icon',
    scope: 'item',
    layouts: WITH_CARDS,
    field: 'links[].design.iconShape',
    resolvers: [{ module: '@/lib/sanity/surface-options', export: 'iconLook' }],
    render: LINK_LIST,
    target: LINK_ITEMS,
    change: 'content',
    base: { ...linkListContent(false), ...CUSTOMISED },
    probe: { 'links.0.design.iconShape': 'circle' },
  },
  {
    id: 'linkList.action.card',
    component: 'linkList',
    capability: 'action',
    scope: 'card',
    layouts: WITH_ARROWS,
    field: 'linkDesign.arrowStyle',
    resolvers: [
      // Whether there is an arrow, and which, is the card design; LinkArrow draws it.
      { module: '@/features/pages/utils/link-card-design', export: 'resolveLinkCardDesign' },
      { module: '@/components/ui/link-arrow', export: 'LinkArrow' },
    ],
    render: LINK_LIST,
    target: LINK_ITEMS,
    change: 'content',
    base: linkListContent(true),
    probe: { 'linkDesign.arrowStyle': 'arrow' },
  },
  {
    id: 'linkList.action.item',
    component: 'linkList',
    capability: 'action',
    scope: 'item',
    layouts: WITH_ARROWS,
    field: 'links[].design.arrowStyle',
    resolvers: [
      // Whether there is an arrow, and which, is the card design; LinkArrow draws it.
      { module: '@/features/pages/utils/link-card-design', export: 'resolveLinkCardDesign' },
      { module: '@/components/ui/link-arrow', export: 'LinkArrow' },
    ],
    render: LINK_LIST,
    target: LINK_ITEMS,
    change: 'content',
    base: { ...linkListContent(true), ...CUSTOMISED },
    probe: { 'links.0.design.arrowStyle': 'arrow' },
  },
  {
    id: 'linkList.depth.card',
    component: 'linkList',
    capability: 'depth',
    scope: 'card',
    layouts: WITH_CARDS,
    field: 'depthDesign.linkShadow',
    resolvers: [{ module: '@/lib/sanity/depth-options', export: 'resolveDepth' }],
    render: LINK_LIST,
    target: LINK_ITEMS,
    change: 'content',
    base: linkListContent(true),
    probe: { 'depthDesign.linkShadow': 'floating' },
  },
  {
    id: 'linkList.depth.item',
    component: 'linkList',
    capability: 'depth',
    scope: 'item',
    layouts: WITH_CARDS,
    field: 'links[].design.shadow',
    resolvers: [{ module: '@/lib/sanity/depth-options', export: 'resolveDepth' }],
    render: LINK_LIST,
    target: LINK_ITEMS,
    change: 'content',
    base: { ...linkListContent(true), ...CUSTOMISED },
    probe: { 'links.0.design.shadow': 'floating' },
  },
  {
    id: 'linkList.pictureDepth.section',
    component: 'linkList',
    capability: 'pictureDepth',
    scope: 'section',
    layouts: ALL_LINK_LIST,
    field: 'depthDesign.pictureShadow',
    resolvers: [{ module: '@/lib/sanity/depth-options', export: 'resolveDepth' }],
    render: `${LINK_LIST}/profile.tsx`,
    target: '[data-profile-image]',
    change: 'attributes',
    base: linkListContent(true),
    probe: { 'depthDesign.pictureShadow': 'floating' },
  },
  {
    id: 'linkList.framing.profile',
    component: 'linkList',
    capability: 'framing',
    scope: 'section',
    part: 'profile',
    layouts: ALL_LINK_LIST,
    field: 'profile.image',
    // The profile picture is cropped by the image URL itself (Sanity's crop and hotspot).
    resolvers: [{ module: '@/lib/sanity/image', export: 'urlFor' }],
    render: 'src/components/ui/profile-image.tsx',
    target: '[data-profile-image]',
    change: 'content',
    base: linkListContent(true),
    probe: { 'profile.image.crop': CROPPED },
  },
  {
    id: 'linkList.framing.thumbnail',
    component: 'linkList',
    capability: 'framing',
    scope: 'item',
    part: 'thumbnail',
    layouts: ['stacked', 'cards'],
    field: 'links[].thumbnail',
    resolvers: [{ module: '@/lib/sanity/image-framing', export: 'visibleArea' }],
    render: LINK_LIST,
    target: LINK_ITEMS,
    change: 'content',
    base: linkListContent(true),
    probe: { 'links.0.thumbnail.crop': CROPPED },
  },
  {
    id: 'linkList.divider.section',
    component: 'linkList',
    capability: 'divider',
    scope: 'section',
    layouts: ALL_LINK_LIST,
    field: 'dividerDesign.afterProfile',
    resolvers: [{ module: '@/lib/sanity/divider-options', export: 'resolveDivider' }],
    render: 'src/components/ui/decorative-divider.tsx',
    target: SECTION_CONTAINER,
    change: 'content',
    base: linkListContent(true),
    probe: { 'dividerDesign.afterProfile': { _type: 'decorativeDivider', style: 'line' } },
  },
]

// ---------------------------------------------------------------------------------------------------
// Location's content sources, drawn by the section itself from Business info

const LOCATION = {
  component: 'location',
  render: 'src/features/pages/components/sections/location',
} as const

const LOCATION_SOURCE_TESTS = 'src/features/pages/components/sections/location/sources.test.tsx'
const LOCATION_FACADE_TESTS =
  'src/features/pages/components/sections/location/click-to-load.test.tsx'

const locationSources: SourceEvidence[] = [
  {
    ...LOCATION,
    id: 'location.addressCard',
    source: 'location.addressCard',
    field: 'showHours',
    resolvers: [{ module: '@/lib/location-links', export: 'addressLines' }],
    // The card is what shows without a map image.
    base: { mapImage: null },
    probe: { showHours: false },
    tests: [
      {
        file: LOCATION_SOURCE_TESTS,
        cases: [
          'draws the address card from Business info',
          'puts the address on a card only when there is no map image',
          'draws no address card without an address',
          'draws no address once the address lines are disconnected',
        ],
      },
    ],
  },
  {
    ...LOCATION,
    id: 'location.directionsLink',
    source: 'location.directionsLink',
    field: 'directionsLabel',
    resolvers: [{ module: '@/lib/location-links', export: 'directionsUrl' }],
    probe: { directionsLabel: 'Find us' },
    tests: [
      {
        file: LOCATION_SOURCE_TESTS,
        cases: [
          'links to Google Maps directions to the address, in a new tab',
          'points at the coordinates when Business info has them',
          'loads nothing from Google until it is followed',
          'draws no directions link without an address',
          'draws no directions link once the directions address is disconnected',
        ],
      },
    ],
  },
  {
    ...LOCATION,
    id: 'location.clickToLoadEmbed',
    source: 'location.clickToLoadEmbed',
    field: 'interactiveMap',
    resolvers: [
      { module: '@/lib/location-links', export: 'embedUrl' },
      { module: '@/features/pages/components/sections/location/map-embed', export: 'MapEmbed' },
    ],
    base: { mapImage: null },
    probe: { interactiveMap: true },
    tests: [
      {
        file: LOCATION_FACADE_TESTS,
        cases: [
          'draws no map or button when the interactive map is off',
          'draws no button, frame or Google address in the server markup',
          'offers a Load interactive map button, with a note that the map comes from Google',
          'loads the map only after a click, and moves focus to it',
          'draws no facade once the embed address is disconnected',
          'keeps the picture above the button when there is a map image',
        ],
      },
    ],
  },
]

// ---------------------------------------------------------------------------------------------------
// The registry

export const EVIDENCE: readonly Evidence[] = [
  ...frameEvidence('hero', {
    glass: ['overlay', 'split', 'editorial'],
    edge: ['overlay', 'split', 'editorial', 'full-bleed'],
    motion: ['overlay', 'split', 'editorial', 'full-bleed'],
  }),
  {
    id: 'hero.slots.supporting',
    component: 'hero',
    capability: 'slots',
    scope: 'section',
    // What this proves is that the slot draws its block, in the wrapper the hero gives it. How each
    // layout then makes room for it (Editorial widens its grid) is placement, a separate part that no
    // evidence covers yet.
    part: 'block',
    layouts: ['overlay', 'split', 'editorial', 'full-bleed'],
    field: 'supporting',
    resolvers: [{ module: '@/features/pages/slots/render-slot', export: 'renderSlot' }],
    render: 'src/features/pages/components/sections/hero/slots.tsx',
    target: '[data-hero-slot]',
    change: 'appears',
    base: { supporting: null },
    probe: { supporting: STATS_BAR },
  },
  ...frameEvidence('mediaText', {
    overlay: ['side', 'stacked'],
    glass: ['side', 'stacked', 'overlay'],
    edge: ['side', 'stacked', 'overlay'],
    motion: ['side', 'stacked', 'overlay'],
  }),
  {
    id: 'mediaText.slots.media',
    component: 'mediaText',
    capability: 'slots',
    scope: 'section',
    part: 'block',
    layouts: ['side', 'stacked', 'overlay'],
    field: 'media',
    // The media slot's picture is chosen here and drawn as the section's picture, or its background.
    resolvers: [{ module: '@/features/pages/utils/split-layout', export: 'chooseMedia' }],
    render: 'src/features/pages/components/sections/media-text.tsx',
    // The picture has no hook of its own: with the slot empty the section draws no <img> at all.
    target: 'section img',
    change: 'appears',
    base: { media: null, image: null },
    probe: { media: SLOT_IMAGE },
  },
  {
    id: 'mediaText.slots.supporting',
    component: 'mediaText',
    capability: 'slots',
    scope: 'section',
    part: 'block',
    layouts: ['side', 'stacked', 'overlay'],
    field: 'supporting',
    resolvers: [{ module: '@/features/pages/slots/render-slot', export: 'renderSlot' }],
    render: 'src/features/pages/components/sections/media-text.tsx',
    target: '[data-slot-video]',
    change: 'appears',
    base: { media: SLOT_IMAGE, supporting: null },
    probe: { supporting: SLOT_VIDEO },
  },
  ...frameEvidence('testimonials', {
    overlay: ['grid', 'slider'],
    glass: ['grid', 'slider'],
    edge: ['grid', 'slider'],
    motion: ['grid', 'slider'],
  }),
  {
    id: 'testimonials.manual',
    component: 'testimonials',
    source: 'testimonials.manual',
    layouts: ['grid', 'slider'],
    field: 'items',
    resolvers: [
      {
        module: '@/features/pages/components/sections/testimonials/quote-card',
        export: 'QuoteCard',
      },
    ],
    render: 'src/features/pages/components/sections/testimonials/quote-card.tsx',
    base: {
      items: [{ _key: 'q1', _type: 'testimonial', quote: 'Kind words.', name: 'Fixture Person' }],
    },
    probe: { 'items.0.quote': 'Different kind words.' },
    tests: [
      {
        file: 'src/features/pages/components/sections/testimonials/manual-source.test.tsx',
        cases: [
          'draws each stored quote, name and role in its own card',
          'draws only what was stored',
          'draws no source label, rating or review markup',
          'draws no cards without items',
          'draws nothing of its own once the quote card is disconnected',
        ],
      },
    ],
  },
  ...frameEvidence('richText', { overlay: true, glass: true, edge: true, motion: true }),
  ...frameEvidence('featuresGrid', { overlay: true, glass: true, edge: true, motion: true }),
  ...frameEvidence('logoCloud', {
    overlay: ['grid', 'marquee'],
    glass: ['grid', 'marquee'],
    edge: ['grid', 'marquee'],
    motion: ['grid', 'marquee'],
  }),
  ...frameEvidence('faq', { overlay: true, glass: true, edge: true, motion: true }),
  // The CTA banner draws its own card, so the shared Panel isn't offered: its glass is pending.
  ...frameEvidence('ctaBanner', { overlay: true, edge: true, motion: true }),
  ...frameEvidence('formSection', { overlay: true, glass: true, edge: true, motion: true }),
  ...frameEvidence('pricingTable', { overlay: true, glass: true, edge: true, motion: true }),
  ...frameEvidence('newsletterSignup', { overlay: true, glass: true, edge: true, motion: true }),
  ...frameEvidence('stats', {
    overlay: ['inline', 'cards'],
    glass: ['inline', 'cards'],
    edge: ['inline', 'cards'],
    motion: ['inline', 'cards'],
  }),
  ...frameEvidence('gallery', {
    overlay: ['grid', 'masonry', 'slider'],
    glass: ['grid', 'masonry', 'slider'],
    edge: ['grid', 'masonry', 'slider'],
    motion: ['grid', 'masonry', 'slider'],
  }),
  ...frameEvidence('location', { overlay: true, glass: true, edge: true, motion: true }),
  ...frameEvidence('team', {
    overlay: ['grid', 'slider', 'list'],
    glass: ['grid', 'slider', 'list'],
    edge: ['grid', 'slider', 'list'],
    motion: ['grid', 'slider', 'list'],
  }),
  ...frameEvidence('video', {
    overlay: ['embed', 'ambient'],
    glass: ['embed', 'ambient'],
    edge: ['embed', 'ambient'],
    motion: ['embed', 'ambient'],
  }),
  ...frameEvidence('process', {
    overlay: ['vertical', 'alternating'],
    glass: ['vertical', 'alternating'],
    edge: ['vertical', 'alternating'],
    motion: ['vertical', 'alternating'],
  }),
  ...frameEvidence('embed', { overlay: true, glass: true, edge: true, motion: true }),
  ...frameEvidence('events', {
    overlay: ['list', 'agenda', 'featured'],
    glass: ['list', 'agenda', 'featured'],
    edge: ['list', 'agenda', 'featured'],
    motion: ['list', 'agenda', 'featured'],
  }),
  ...locationSources,
  ...frameEvidence('linkList', {
    overlay: ALL_LINK_LIST,
    edge: ALL_LINK_LIST,
    motion: ALL_LINK_LIST,
  }),
  ...linkListEvidence,
]
