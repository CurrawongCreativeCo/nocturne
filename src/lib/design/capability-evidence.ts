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
  /** The resolver the renderer calls, checked to exist. */
  resolver: { module: string; export: string }
  /** The file or folder that draws the target, checked to exist. */
  render: string
  /** A CSS selector into the component's output: the element the capability renders on. */
  target: string
  /** What the probe must change on the target: its own attributes, or anything inside it too. */
  change: 'attributes' | 'content'
  /** Stored values both renders start from. `$picture` stands for the fixtures' picture. */
  base?: Patch
  /** What the probe sets on top of `base`. */
  probe: Patch
}

export interface CapabilityEvidence extends EvidenceBase {
  capability: CapabilityId
  scope: Scope
  part?: string
}

export interface SourceEvidence extends EvidenceBase {
  source: ContentSourceId
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
    resolver: { module: '@/components/ui/section-style', export: 'resolveSectionStyle' },
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
    resolver: { module: '@/lib/sanity/section-panel', export: 'resolveSectionPanel' },
    render: 'src/components/ui/section-frame.tsx',
    target: SECTION_CONTAINER,
    change: 'attributes',
    probe: { 'style.panel': 'solid' },
  },
  edge: {
    capability: 'edge',
    scope: 'section',
    field: 'style.edge',
    resolver: { module: '@/components/ui/section-style', export: 'resolveEdge' },
    render: 'src/components/ui/section-frame.tsx',
    // The edge wraps the whole section in its frame.
    target: 'body > :first-child',
    change: 'attributes',
    probe: { 'style.edge': 'wave' },
  },
  motion: {
    capability: 'motion',
    scope: 'section',
    field: 'style.motion',
    resolver: { module: '@/components/ui/section-style', export: 'sectionMotion' },
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
const FIRST_LINK = 'ul > li:first-child'

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

const linkListEvidence: CapabilityEvidence[] = [
  {
    id: 'linkList.surface.card',
    component: 'linkList',
    capability: 'surface',
    scope: 'card',
    layouts: WITH_CARDS,
    field: 'cardDesign.border',
    resolver: { module: '@/lib/sanity/surface-options', export: 'ringSurfaceLook' },
    render: LINK_LIST,
    target: FIRST_LINK,
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
    resolver: { module: '@/lib/sanity/surface-options', export: 'ringSurfaceLook' },
    render: LINK_LIST,
    target: FIRST_LINK,
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
    resolver: { module: '@/lib/sanity/text-style-options', export: 'textLook' },
    render: LINK_LIST,
    target: FIRST_LINK,
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
    resolver: { module: '@/lib/sanity/text-style-options', export: 'textLook' },
    render: LINK_LIST,
    target: FIRST_LINK,
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
    resolver: { module: '@/lib/sanity/surface-options', export: 'iconLook' },
    render: LINK_LIST,
    target: FIRST_LINK,
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
    resolver: { module: '@/lib/sanity/surface-options', export: 'iconLook' },
    render: LINK_LIST,
    target: FIRST_LINK,
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
    resolver: { module: '@/components/ui/link-arrow', export: 'LinkArrow' },
    render: LINK_LIST,
    target: FIRST_LINK,
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
    resolver: { module: '@/components/ui/link-arrow', export: 'LinkArrow' },
    render: LINK_LIST,
    target: FIRST_LINK,
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
    resolver: { module: '@/lib/sanity/depth-options', export: 'resolveDepth' },
    render: LINK_LIST,
    target: FIRST_LINK,
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
    resolver: { module: '@/lib/sanity/depth-options', export: 'resolveDepth' },
    render: LINK_LIST,
    target: FIRST_LINK,
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
    resolver: { module: '@/lib/sanity/depth-options', export: 'resolveDepth' },
    render: `${LINK_LIST}/profile.tsx`,
    target: ':has(> [data-profile-image])',
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
    resolver: { module: '@/lib/sanity/image-framing', export: 'visibleArea' },
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
    resolver: { module: '@/lib/sanity/image-framing', export: 'visibleArea' },
    render: LINK_LIST,
    target: FIRST_LINK,
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
    resolver: { module: '@/lib/sanity/divider-options', export: 'resolveDivider' },
    render: 'src/components/ui/decorative-divider.tsx',
    target: SECTION_CONTAINER,
    change: 'content',
    base: linkListContent(true),
    probe: { 'dividerDesign.afterProfile': { _type: 'decorativeDivider', style: 'line' } },
  },
  {
    id: 'linkList.glass.card',
    component: 'linkList',
    capability: 'glass',
    scope: 'card',
    layouts: ['stacked'],
    field: 'rowStyle',
    resolver: { module: '@/lib/sanity/surface-options', export: 'glassSurfaceLook' },
    render: `${LINK_LIST}/glass-row.tsx`,
    target: FIRST_LINK,
    change: 'content',
    base: linkListContent(true),
    probe: { rowStyle: 'glass' },
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
    layouts: ['overlay', 'split', 'editorial', 'full-bleed'],
    field: 'supporting',
    resolver: { module: '@/features/pages/slots/render-slot', export: 'renderSlot' },
    render: 'src/features/pages/components/sections/hero',
    target: SECTION_CONTAINER,
    change: 'content',
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
    layouts: ['side', 'stacked', 'overlay'],
    field: 'media',
    resolver: { module: '@/features/pages/slots/render-slot', export: 'renderSlot' },
    render: 'src/features/pages/components/sections/media-text.tsx',
    target: SECTION_CONTAINER,
    change: 'content',
    base: { media: null, image: null },
    probe: { media: SLOT_IMAGE },
  },
  {
    id: 'mediaText.slots.supporting',
    component: 'mediaText',
    capability: 'slots',
    scope: 'section',
    layouts: ['side', 'stacked', 'overlay'],
    field: 'supporting',
    resolver: { module: '@/features/pages/slots/render-slot', export: 'renderSlot' },
    render: 'src/features/pages/components/sections/media-text.tsx',
    target: SECTION_CONTAINER,
    change: 'content',
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
    resolver: {
      module: '@/features/pages/components/sections/testimonials',
      export: 'Testimonials',
    },
    render: 'src/features/pages/components/sections/testimonials',
    target: SECTION_CONTAINER,
    change: 'content',
    base: {
      items: [{ _key: 'q1', _type: 'testimonial', quote: 'Kind words.', name: 'Fixture Person' }],
    },
    probe: { 'items.0.quote': 'Different kind words.' },
  },
  ...frameEvidence('linkList', {
    overlay: ALL_LINK_LIST,
    edge: ALL_LINK_LIST,
    motion: ALL_LINK_LIST,
  }),
  ...linkListEvidence,
]
