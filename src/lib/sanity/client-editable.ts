import type { ConditionalProperty, SchemaTypeDefinition } from 'sanity'

import { hiddenFromClients } from './roles'

/**
 * The field classification registry: for every document and object type a client can reach, which
 * of its fields clients may change (`editable`) and which stay with the agency (`agencyOnly`).
 * Studio's client view hides every field not in `editable` (`withClientEditableHiding`), and
 * src/lib/sanity/client-editable.test.ts fails when a field in schema.json is in neither list.
 * A field added later is therefore hidden from clients until someone decides it is theirs.
 * README, "Studio roles and permissions" explains how to classify a new field.
 *
 * Seeded from the Studio as it was: a field is `editable` unless it was hidden from clients for
 * every layout (`hiddenFromClients`, the Design tab and the Advanced fieldsets). Fields that only
 * hide for some layouts or settings (a hero's "Image side") stay `editable`; their own `hidden`
 * still applies on top.
 */
export interface FieldClassification {
  editable: readonly string[]
  agencyOnly: readonly string[]
}

/**
 * Types whose fields clients never change. Every field on them is agency only, now and later. The
 * generators (`new:section`, `new:document`, `new:singleton`) add new types here; move one to
 * `CLIENT_EDITABLE_FIELDS` when clients should change some of its fields.
 */
export const AGENCY_ONLY_TYPES: ReadonlySet<string> = new Set([
  'sharedSection',
  'redirect',
  'form',
  'cookieBanner',
  'designSettings',
  'experiment',
  'stripePrice',
  'frame',
  'sectionStyle',
  'imageDesign',
  'decorativeDivider',
  // new-type:agency-only
])

/** Types with a mix: classify each of their stored fields. */
export const CLIENT_EDITABLE_FIELDS: Readonly<Record<string, FieldClassification>> = {
  // Documents
  page: {
    editable: ['title', 'slug', 'pageBuilder', 'seo'],
    agencyOnly: ['access', 'minimalLayout'],
  },
  post: {
    editable: [
      'title',
      'slug',
      'excerpt',
      'mainImage',
      'body',
      'categories',
      'author',
      'publishedAt',
      'seo',
    ],
    agencyOnly: [],
  },
  author: {
    editable: ['name', 'image', 'bio'],
    agencyOnly: [],
  },
  category: {
    editable: ['title', 'slug'],
    agencyOnly: [],
  },
  enquiry: {
    editable: ['status', 'formTitle', 'form', 'fields', 'pagePath', 'createdAt', 'attribution'],
    agencyOnly: [],
  },
  siteIdentity: {
    editable: ['title', 'description', 'logo', 'ogImage', 'browserIcon'],
    agencyOnly: ['allowAiCrawlers', 'verificationMarker'],
  },
  siteNavigation: {
    editable: ['headerNav', 'headerCta', 'footerNav', 'footerText'],
    agencyOnly: ['footerShowSocial', 'footerSocialStyle'],
  },
  announcement: {
    editable: ['message', 'link', 'startsAt', 'endsAt', 'dismissible'],
    agencyOnly: [],
  },
  businessInfo: {
    editable: [
      'tradingName',
      'legalName',
      'abn',
      'phone',
      'publicEmail',
      'address',
      'timeZone',
      'openingHours',
      'specialHours',
      'serviceAreas',
      'socialLinks',
    ],
    agencyOnly: ['businessType', 'businessTypeOther', 'geo', 'priceRange'],
  },
  teamMember: {
    editable: [
      'name',
      'role',
      'portrait',
      'shortBio',
      'slug',
      'bio',
      'qualifications',
      'publicEmail',
      'phone',
      'socialLinks',
      'socialDisplay',
      'order',
    ],
    agencyOnly: [],
  },
  event: {
    editable: [
      'title',
      'slug',
      'start',
      'end',
      'allDay',
      'timeZone',
      'summary',
      'body',
      'image',
      'location',
      'category',
      'registration',
      'status',
      'capacityNote',
      'recurrence',
    ],
    agencyOnly: [],
  },
  eventCategory: {
    editable: ['title'],
    agencyOnly: [],
  },
  panel: {
    editable: ['title', 'content'],
    agencyOnly: ['presentation', 'width', 'swipeToClose', 'slug'],
  },
  // Page sections and shared objects
  hero: {
    editable: [
      'variant',
      'eyebrow',
      'eyebrowLabels',
      'heading',
      'title',
      'description',
      'ctas',
      'backgroundImage',
      'imagePosition',
      'secondaryImage',
      'showGreeting',
    ],
    agencyOnly: [
      'eyebrowDesign',
      'imageDesign',
      'supporting',
      'access',
      'style',
      'proportion',
      'imageShape',
      'partMotion',
    ],
  },
  richText: {
    editable: ['body'],
    agencyOnly: ['access', 'style'],
  },
  mediaText: {
    editable: ['eyebrow', 'heading', 'title', 'body', 'ctas', 'image', 'imagePosition'],
    agencyOnly: ['imageDesign', 'access', 'style'],
  },
  featuresGrid: {
    editable: ['heading', 'title', 'intro', 'columns', 'items'],
    agencyOnly: ['access', 'style'],
  },
  logoCloud: {
    editable: ['heading', 'title', 'logos'],
    agencyOnly: ['variant', 'access', 'style', 'logoColour'],
  },
  testimonials: {
    editable: ['heading', 'title', 'items'],
    agencyOnly: ['variant', 'access', 'style'],
  },
  faq: {
    editable: ['heading', 'title', 'intro', 'items'],
    agencyOnly: ['access', 'style'],
  },
  ctaBanner: {
    editable: ['heading', 'title', 'text', 'ctas', 'tone'],
    agencyOnly: ['access', 'style'],
  },
  formSection: {
    editable: ['heading', 'title', 'text', 'form'],
    agencyOnly: ['access', 'style'],
  },
  pricingTable: {
    editable: ['heading', 'title', 'intro', 'plans'],
    agencyOnly: ['access', 'style'],
  },
  newsletterSignup: {
    editable: ['heading', 'title', 'text', 'submitLabel', 'successMessage'],
    agencyOnly: ['access', 'style'],
  },
  stats: {
    editable: ['heading', 'title', 'intro', 'items'],
    agencyOnly: ['variant', 'access', 'style'],
  },
  gallery: {
    editable: ['heading', 'title', 'intro', 'images'],
    agencyOnly: ['variant', 'imageDesign', 'access', 'style', 'columns'],
  },
  location: {
    editable: [
      'heading',
      'title',
      'intro',
      'mapImage',
      'showHours',
      'showOpenNow',
      'showContact',
      'showSocial',
      'directionsLabel',
    ],
    agencyOnly: ['access', 'style', 'interactiveMap'],
  },
  team: {
    editable: ['heading', 'title', 'text', 'selection', 'members'],
    agencyOnly: ['variant', 'imageDesign', 'access', 'style'],
  },
  video: {
    editable: [
      'heading',
      'title',
      'text',
      'source',
      'url',
      'file',
      'poster',
      'captions',
      'aspectRatio',
    ],
    agencyOnly: ['variant', 'access', 'style'],
  },
  process: {
    editable: ['heading', 'title', 'intro', 'steps'],
    agencyOnly: ['variant', 'access', 'style'],
  },
  embed: {
    editable: ['heading', 'title', 'text', 'provider', 'url', 'height'],
    agencyOnly: ['access', 'style', 'customHeight'],
  },
  linkList: {
    editable: [
      'variant',
      'heading',
      'title',
      'headingDisplay',
      'headingImage',
      'profile',
      'socialSource',
      'socialLinks',
      'links',
      'thumbnailSize',
      'glassStrength',
      'showArrows',
      'rowStyle',
    ],
    agencyOnly: [
      'profileDesign',
      'categoryDesign',
      'cardDesign',
      'linkDesign',
      'socialDesign',
      'dividerDesign',
      'depthDesign',
      'access',
      'style',
    ],
  },
  events: {
    editable: ['heading', 'title', 'text', 'seeAllLink', 'seeAllLabel'],
    agencyOnly: ['variant', 'access', 'style', 'category', 'count'],
  },
  navItem: {
    editable: ['label', 'link'],
    agencyOnly: [],
  },
  panelText: {
    editable: ['image', 'body'],
    agencyOnly: [],
  },
  panelForm: {
    editable: ['form'],
    agencyOnly: [],
  },
  link: {
    editable: [
      'linkType',
      'internal',
      'url',
      'anchor',
      'panel',
      'bookingUrl',
      'openInNewTab',
      'fallbackUrl',
    ],
    agencyOnly: [],
  },
  cta: {
    editable: ['label', 'link', 'variant'],
    agencyOnly: [],
  },
  seo: {
    editable: ['metaTitle', 'metaDescription', 'ogImage'],
    agencyOnly: ['noIndex'],
  },
  statItem: {
    editable: ['value', 'label', 'prefix', 'suffix', 'decimals'],
    agencyOnly: [],
  },
  statsBar: {
    editable: ['items', 'caption'],
    agencyOnly: [],
  },
  badgeRow: {
    editable: ['badges'],
    agencyOnly: [],
  },
  logoRow: {
    editable: ['logos', 'greyscale'],
    agencyOnly: [],
  },
  launchDate: {
    editable: ['label', 'date', 'time', 'countdown'],
    agencyOnly: [],
  },
}

/** Whether clients may change `field` on `type`. Unclassified fields, and unknown types, are not editable. */
export function isClientEditable(type: string, field: string): boolean {
  return CLIENT_EDITABLE_FIELDS[type]?.editable.includes(field) ?? false
}

type Fields = { name: string; hidden?: ConditionalProperty }[]

/**
 * Wraps the schema so every field outside the registry's `editable` lists is hidden from clients
 * (on top of any `hidden` the field already has). Agency staff are unaffected. Apply it once, to the
 * list passed to `schema.types` in sanity.config.ts.
 */
export function withClientEditableHiding(types: SchemaTypeDefinition[]): SchemaTypeDefinition[] {
  return types.map((type) => {
    const fields = (type as { fields?: Fields }).fields
    if (!Array.isArray(fields)) return type
    return {
      ...type,
      fields: fields.map((field) =>
        isClientEditable(type.name, field.name)
          ? field
          : { ...field, hidden: hideFromClients(field.hidden) },
      ),
    } as SchemaTypeDefinition
  })
}

function hideFromClients(own: ConditionalProperty): ConditionalProperty {
  if (own === true || own === hiddenFromClients) return own
  return (context) =>
    hiddenFromClients(context) || (typeof own === 'function' ? own(context) : (own ?? false))
}
