/**
 * Content served by the fake Content Lake in end-to-end tests. Each document exercises
 * specific behavior; keep the tests in tests/e2e in sync when changing it.
 */
let n = 0
const key = () => `k${++n}`

const ref = (id) => ({ _type: 'reference', _ref: id })
const internal = (id, openInNewTab = false) => ({
  _type: 'link',
  linkType: 'internal',
  internal: ref(id),
  openInNewTab,
})
const external = (url, openInNewTab = false) => ({
  _type: 'link',
  linkType: 'external',
  url,
  openInNewTab,
})
const anchor = (id) => ({ _type: 'link', linkType: 'anchor', anchor: id })
const panel = (id, fallbackUrl) => ({
  _type: 'link',
  linkType: 'panel',
  panel: ref(id),
  ...(fallbackUrl && { fallbackUrl }),
})
const booking = (bookingUrl) => ({ _type: 'link', linkType: 'booking', bookingUrl })
const cta = (label, link, variant = 'primary') => ({
  _key: key(),
  _type: 'cta',
  label,
  variant,
  link,
})
/** Panel content: text, one paragraph per argument. */
const panelText = (...paragraphs) => ({
  _key: key(),
  _type: 'panelText',
  body: paragraphs.map((text) => block([text])),
})
const navItem = (label, id) => ({ _key: key(), _type: 'navItem', label, link: internal(id) })
const block = (children, extra = {}) => ({
  _key: key(),
  _type: 'block',
  style: 'normal',
  markDefs: [],
  children: children.map((c) =>
    typeof c === 'string' ? { _key: key(), _type: 'span', text: c, marks: [] } : c,
  ),
  ...extra,
})

/**
 * A `headingText` value: a single block whose parts are plain strings or [text, treatment, gradient,
 * extra] (a highlighted phrase; `extra` adds fields such as a custom gradient's `stops` and `angle`).
 * Keys are derived from the heading's own, so documents stay stable.
 */
const headingText = (id, parts) => {
  const markDefs = []
  const children = parts.map((part, index) => {
    if (typeof part === 'string')
      return { _key: `${id}-s${index}`, _type: 'span', text: part, marks: [] }
    const [text, treatment, gradient, extra] = part
    markDefs.push({
      _key: `${id}-m${index}`,
      _type: 'emphasis',
      treatment,
      ...(gradient && { gradient }),
      ...extra,
    })
    return { _key: `${id}-s${index}`, _type: 'span', text, marks: [`${id}-m${index}`] }
  })
  return [{ _key: `${id}-b`, _type: 'block', style: 'normal', markDefs, children }]
}

const formField = (label, name, type, { required = false, options } = {}) => ({
  _key: `field-${name}`,
  _type: 'formField',
  label,
  name,
  type,
  required,
  ...(options && { options }),
})

const stripePrice = (id, productName, amount, currency, interval, extra = {}) => ({
  _id: `stripePrice-${id}`,
  _type: 'stripePrice',
  priceId: id,
  productId: `prod_${id.slice(6)}`,
  productName,
  amount,
  currency,
  interval,
  intervalCount: 1,
  active: true,
  ...extra,
})
const plan = (priceId, fields = {}) => ({
  _key: key(),
  _type: 'plan',
  price: ref(`stripePrice-${priceId}`),
  highlighted: false,
  ...fields,
})

const abHero = (title) => ({ _key: key(), _type: 'hero', title, description: 'Hero description.' })

const UPDATED = '2026-10-12T00:00:00Z'
const IMAGE_ASSET_ID = 'image-0123456789abcdef0123456789abcdef01234567-1200x630-png'
const image = (alt) => ({ _type: 'image', alt, asset: ref(IMAGE_ASSET_ID) })
// A small transparent pattern (tests/e2e/section-background-image.spec.ts); the spec serves its pixels.
// Two pictures with a blur preview (tests/e2e/image-placeholder.spec.ts): a transparent logo and an opaque photo.
const LOGO_ASSET_ID = 'image-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-400x400-png'
const PHOTO_ASSET_ID = 'image-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb-800x600-jpg'
const LQIP =
  'data:image/jpeg;base64,/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAgP/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
const PATTERN_ASSET_ID = 'image-fedcba9876543210fedcba9876543210fedcba98-160x120-png'
const pattern = () => ({ _type: 'image', alt: '', asset: ref(PATTERN_ASSET_ID) })

/** Four steps with labels, in a fixed order the tests check. The first has a picture. */
const processSteps = (id) => [
  {
    _key: `${id}-discover`,
    label: 'Week 1',
    title: 'Discover',
    text: 'We learn about your business and your customers.',
    icon: image(`${id}-discover`),
  },
  {
    _key: `${id}-design`,
    label: 'Weeks 2–3',
    title: 'Design',
    text: 'We shape the look and feel.',
  },
  { _key: `${id}-build`, title: 'Build', text: 'We bring the design to life.' },
  { _key: `${id}-launch`, label: 'Week 7', title: 'Launch', text: 'We go live and stay close.' },
]

// Video section (tests/e2e/video.spec.ts). The files are never fetched: the specs stand in for the CDN and the players.
const VIDEO_ASSET_ID = 'file-0123456789abcdef0123456789abcdef01234567-mp4'
const CAPTIONS_ASSET_ID = 'file-89abcdef0123456789abcdef0123456789abcdef-vtt'
const fileRef = (id) => ({ _type: 'file', asset: ref(id) })
const FRAME_ASSET_ID = 'file-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-svg'
const FRAME_URL =
  'https://cdn.sanity.io/files/test/test/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.svg'

/** An `imageDesign` value (README, "Image design"). */
const imageDesign = (fields) => ({ _type: 'imageDesign', ...fields })
const VIDEO_URL = {
  youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  vimeo: 'https://vimeo.com/76979871',
}
const videoSection = (id, fields) => ({
  _key: id,
  _type: 'video',
  poster: image(`${fields.title} poster`),
  ...fields,
})

// Embed section (tests/e2e/embed.spec.ts). The providers are never reached: the spec stands in for them.
const EMBED_URL = {
  typeform: 'https://form.typeform.com/to/AbCd1234',
  maps: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3312.0!2d151.17!3d-33.89!2m3!1f0!2f0!3f0',
  spotify: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
}
const embedSection = (id, fields) => ({ _key: id, _type: 'embed', ...fields })

// The blog: 14 posts, so the index paginates (12 + 2). The first four have categories, set up so
// "Welcome to the blog" has three related posts whose score order differs from their date order:
// the roundup shares two categories but is oldest of the three.
const blogPost = (
  id,
  title,
  publishedAt,
  { categories = [], author = 'author-ann', seo } = {},
) => ({
  _id: `post-${id}`,
  _type: 'post',
  title,
  slug: { _type: 'slug', current: id },
  excerpt: `Summary of ${title}.`,
  mainImage: image(`Picture for ${title}`),
  publishedAt,
  author: ref(author),
  categories: categories.map((category) => ({ _key: key(), ...ref(category) })),
  body: [block([`Body of ${title}.`])],
  ...(seo && { seo: { _type: 'seo', ...seo } }),
})

const blogPosts = [
  {
    ...blogPost('welcome-to-the-blog', 'Welcome to the blog', '2026-10-10T09:00:00Z', {
      categories: ['category-news', 'category-guides'],
    }),
    body: [
      block(['A first heading'], { style: 'h2' }),
      {
        ...block([
          { _key: 'span-a', _type: 'span', text: 'Read ', marks: [] },
          { _key: 'span-b', _type: 'span', text: 'about us', marks: ['link-about'] },
          { _key: 'span-c', _type: 'span', text: ' first.', marks: [] },
        ]),
        markDefs: [{ _key: 'link-about', ...internal('page-about') }],
      },
    ],
  },
  blogPost('news-update', 'News update', '2026-10-09T09:00:00Z', { categories: ['category-news'] }),
  blogPost('how-to-guide', 'How-to guide', '2026-10-08T09:00:00Z', {
    categories: ['category-guides'],
  }),
  blogPost('news-and-guides-roundup', 'News and guides roundup', '2026-10-07T09:00:00Z', {
    categories: ['category-news', 'category-guides'],
  }),
  ...Array.from({ length: 9 }, (_, i) =>
    blogPost(
      `archive-post-${i + 1}`,
      `Archive post ${i + 1}`,
      `2026-10-0${6 - Math.min(i, 5)}T${String(12 - i).padStart(2, '0')}:00:00Z`,
      // The last one points at an author that no longer exists: it must render without a byline.
      i === 8 ? { author: 'author-deleted' } : {},
    ),
  ),
  blogPost('hidden-post', 'Hidden post', '2026-09-01T09:00:00Z', { seo: { noIndex: true } }),
]

export const documents = [
  // Site settings are four singletons; SETTINGS_QUERY assembles them into one result.
  {
    _id: 'siteIdentity',
    _type: 'siteIdentity',
    title: 'Test Co',
    description: 'Default description for Test Co.',
  },
  {
    _id: 'siteNavigation',
    _type: 'siteNavigation',
    headerNav: [navItem('Home', 'page-home'), navItem('About', 'page-about')],
    headerCta: { _type: 'cta', label: 'Contact', variant: 'primary', link: internal('page-about') },
    footerNav: [navItem('About', 'page-about')],
    footerText: 'Test Co. All rights reserved.',
  },
  {
    // Footer details, hours and LocalBusiness structured data (tests/e2e/business-info.spec.ts).
    _id: 'businessInfo',
    _type: 'businessInfo',
    tradingName: 'Test Co',
    legalName: 'Test Co Pty Ltd',
    businessType: 'ProfessionalService',
    abn: '51 824 753 556',
    phone: '(02) 9876 5432',
    publicEmail: 'hello@example.com',
    address: {
      street: '1 King Street',
      suburb: 'Newtown',
      state: 'NSW',
      postcode: '2042',
      country: 'Australia',
    },
    timeZone: 'Australia/Sydney',
    geo: { lat: -33.8978, lng: 151.1788 },
    openingHours: [
      {
        _key: 'weekdays',
        _type: 'hoursRow',
        days: ['mon', 'tue', 'wed', 'thu', 'fri'],
        opens: '08:00',
        closes: '17:30',
      },
      { _key: 'saturday', _type: 'hoursRow', days: ['sat'], opens: '09:00', closes: '13:00' },
      { _key: 'sunday', _type: 'hoursRow', days: ['sun'], closed: true },
    ],
    specialHours: [
      // Long past: must not appear anywhere. The far-future day always shows.
      {
        _key: 'past',
        _type: 'specialDay',
        date: '2020-01-26',
        closed: true,
        note: 'Australia Day',
      },
      {
        _key: 'future',
        _type: 'specialDay',
        date: '2099-12-25',
        closed: true,
        note: 'Christmas Day',
      },
    ],
    serviceAreas: ['Inner West', 'Newcastle'],
    socialLinks: [
      {
        _key: 'fb',
        _type: 'socialLink',
        platform: 'facebook',
        url: 'https://www.facebook.com/testco',
      },
    ],
    priceRange: '$$',
  },
  {
    // Tests move the browser clock around this window (tests/e2e/announcement.spec.ts).
    _id: 'announcement',
    _type: 'announcement',
    message: 'Summer sale: 20% off all services',
    link: internal('page-about'),
    startsAt: '2026-01-01T00:00:00Z',
    endsAt: '2100-01-01T00:00:00Z',
    dismissible: true,
  },
  {
    _id: 'cookieBanner',
    _type: 'cookieBanner',
    title: 'Your privacy choices',
    message: 'Test Co uses analytics cookies only if you allow them.',
    privacyLabel: 'Read the privacy policy',
    privacyLink: internal('page-about'),
  },
  {
    // Starts with a hero: the hero provides the page's <h1>.
    _id: 'page-home',
    _type: 'page',
    title: 'Home',
    slug: { _type: 'slug', current: 'home' },
    seo: { _type: 'seo', metaDescription: 'Home page description.' },
    pageBuilder: [
      {
        _key: key(),
        _type: 'hero',
        title: 'Welcome to Test Co',
        description: 'Hero description.',
        showGreeting: true,
        ctas: [
          cta('About us', internal('page-about')),
          cta('Learn more', internal('page-about'), 'secondary'),
        ],
      },
      {
        _key: key(),
        _type: 'featuresGrid',
        title: 'Features',
        columns: 3,
        items: [1, 2, 3].map((i) => ({
          _key: key(),
          _type: 'featureItem',
          title: `Feature ${i}`,
          text: 'Text.',
        })),
      },
      {
        // No image: should render as a single column.
        _key: key(),
        _type: 'mediaText',
        eyebrow: 'Eyebrow',
        title: 'Media without an image',
        body: [block(['Body text.'])],
        imagePosition: 'right',
        ctas: [cta('Read more', internal('page-about'))],
      },
      videoSection(key(), {
        variant: 'embed',
        title: 'Watch our story',
        source: 'youtube',
        url: VIDEO_URL.youtube,
      }),
      {
        _key: key(),
        _type: 'testimonials',
        title: 'Testimonials',
        items: [{ _key: key(), _type: 'testimonial', quote: 'Great.', name: 'Alex', role: 'CEO' }],
      },
      {
        _key: key(),
        _type: 'faq',
        title: 'FAQ',
        items: [
          {
            _key: key(),
            _type: 'faqItem',
            question: 'A question?',
            answer: [block(['An answer.'])],
          },
        ],
      },
      {
        _key: key(),
        _type: 'ctaBanner',
        title: 'Brand banner',
        text: 'Banner text.',
        tone: 'brand',
        ctas: [cta('Get started', internal('page-about'))],
      },
    ],
  },
  {
    // Starts with rich text: the page title becomes a visually hidden <h1>.
    _id: 'page-about',
    _type: 'page',
    title: 'About',
    slug: { _type: 'slug', current: 'about' },
    pageBuilder: [
      {
        _key: key(),
        _type: 'richText',
        body: [
          block(['About Test Co.'], { style: 'h2' }),
          {
            ...block([
              { _key: 'span-link', _type: 'span', text: 'External site', marks: ['link-1'] },
            ]),
            markDefs: [{ _key: 'link-1', ...external('https://example.org', true) }],
          },
        ],
      },
      {
        // Its scroll-linked line is part of what the memory test (memory.spec.ts) repeats.
        _key: 'about-process',
        _type: 'process',
        variant: 'alternating',
        title: 'How we work',
        steps: processSteps('about-process'),
      },
      {
        _key: key(),
        _type: 'ctaBanner',
        title: 'Dark banner',
        tone: 'dark',
        ctas: [
          cta('Home', internal('page-home')),
          cta('Secondary', internal('page-home'), 'secondary'),
        ],
      },
    ],
  },
  {
    // The first section is a hero with a parallax picture, followed by enough text to scroll (parallax.spec.ts).
    _id: 'page-parallax',
    _type: 'page',
    title: 'Parallax',
    slug: { _type: 'slug', current: 'parallax' },
    seo: { _type: 'seo', metaDescription: 'A page that starts with a parallax hero.' },
    pageBuilder: [
      {
        _key: 'parallax-hero',
        _type: 'hero',
        title: 'Parallax hero',
        description: 'The picture behind this hero moves as the page scrolls.',
        backgroundImage: image(''),
        style: { _type: 'sectionStyle', motion: 'parallax' },
      },
      {
        _key: 'parallax-text-1',
        _type: 'richText',
        body: [
          block(['Parallax text 1'], { style: 'h2' }),
          block(['A paragraph of copy so the page is long enough to scroll. '.repeat(8)]),
        ],
      },
      {
        // Not the first section: it moves while it crosses the screen (from `viewport`).
        _key: 'parallax-hero-later',
        _type: 'hero',
        variant: 'full-bleed',
        title: 'Later parallax hero',
        description: 'A hero further down the page.',
        backgroundImage: image(''),
        style: { _type: 'sectionStyle', motion: 'parallax' },
      },
      {
        _key: 'parallax-text-2',
        _type: 'richText',
        body: [
          block(['Parallax text 2'], { style: 'h2' }),
          block(['A paragraph of copy so the page is long enough to scroll. '.repeat(8)]),
        ],
      },
      {
        // The parallax preset moves a media section's picture.
        _key: 'parallax-media',
        _type: 'mediaText',
        title: 'Parallax picture',
        body: [block(['Body text beside the picture.'])],
        image: image('Picture'),
        imagePosition: 'right',
        style: { _type: 'sectionStyle', motion: 'parallax' },
      },
      {
        _key: 'parallax-text-3',
        _type: 'richText',
        body: [
          block(['Parallax text 3'], { style: 'h2' }),
          block(['A paragraph of copy so the page is long enough to scroll. '.repeat(8)]),
        ],
      },
      {
        _key: 'parallax-text-4',
        _type: 'richText',
        body: [
          block(['Parallax text 4'], { style: 'h2' }),
          block(['A paragraph of copy so the page is long enough to scroll. '.repeat(8)]),
        ],
      },
    ],
  },
  {
    // Pictures that move inside a still frame (tests/e2e/framed-image.spec.ts).
    _id: 'page-framed-images',
    _type: 'page',
    title: 'Framed images',
    slug: { _type: 'slug', current: 'framed-images' },
    seo: { _type: 'seo', metaDescription: 'Pictures that move inside a still frame.' },
    pageBuilder: [
      {
        _key: 'framed-text-1',
        _type: 'richText',
        body: [
          block(['Framed text 1'], { style: 'h2' }),
          block(['A paragraph of copy so the page is long enough to scroll. '.repeat(8)]),
        ],
      },
      {
        _key: 'framed-builtin',
        _type: 'mediaText',
        title: 'Built-in frame',
        body: [block(['A framed picture that drifts behind its frame.'])],
        image: image('Built-in frame picture'),
        imagePosition: 'right',
        imageDesign: imageDesign({ appearance: 'framed', frame: 'double-line', motion: 'medium' }),
      },
      {
        _key: 'framed-text-2',
        _type: 'richText',
        body: [
          block(['Framed text 2'], { style: 'h2' }),
          block(['A paragraph of copy so the page is long enough to scroll. '.repeat(8)]),
        ],
      },
      {
        _key: 'framed-custom',
        _type: 'mediaText',
        title: 'Approved custom frame',
        body: [block(['The frame is an approved SVG, used as a mask.'])],
        image: image('Custom frame picture'),
        imagePosition: 'left',
        imageDesign: imageDesign({
          appearance: 'framed',
          frame: 'custom',
          customFrame: ref('frame-leaf'),
          motion: 'subtle',
        }),
      },
      {
        _key: 'framed-text-3',
        _type: 'richText',
        body: [
          block(['Framed text 3'], { style: 'h2' }),
          block(['A paragraph of copy so the page is long enough to scroll. '.repeat(8)]),
        ],
      },
      {
        // Shape and motion with no frame at all: the clip still holds.
        _key: 'framed-circle',
        _type: 'mediaText',
        title: 'Circle with parallax',
        body: [block(['A circle is always square.'])],
        image: image('Circle picture'),
        imagePosition: 'right',
        imageDesign: imageDesign({ appearance: 'circle', motion: 'subtle' }),
      },
      {
        _key: 'framed-text-4',
        _type: 'richText',
        body: [
          block(['Framed text 4'], { style: 'h2' }),
          block(['A paragraph of copy so the page is long enough to scroll. '.repeat(8)]),
        ],
      },
      {
        // The section's own parallax moves the picture inside its frame, not the frame (stored values unchanged).
        _key: 'framed-section-parallax',
        _type: 'mediaText',
        title: 'Section parallax',
        body: [block(['Only the picture drifts.'])],
        image: image('Section parallax picture'),
        imagePosition: 'right',
        style: { _type: 'sectionStyle', motion: 'parallax' },
      },
      {
        _key: 'framed-text-5',
        _type: 'richText',
        body: [
          block(['Framed text 5'], { style: 'h2' }),
          block(['A paragraph of copy so the page is long enough to scroll. '.repeat(8)]),
        ],
      },
      {
        // A frame with no motion: the picture neither moves nor is scaled.
        _key: 'framed-still',
        _type: 'mediaText',
        title: 'No motion',
        body: [block(['Nothing moves here.'])],
        image: image('Still picture'),
        imagePosition: 'right',
        imageDesign: imageDesign({ appearance: 'framed', frame: 'corner-brackets' }),
      },
      {
        _key: 'framed-text-6',
        _type: 'richText',
        body: [
          block(['Framed text 6'], { style: 'h2' }),
          block(['A paragraph of copy so the page is long enough to scroll. '.repeat(8)]),
        ],
      },
    ],
  },
  {
    // Panels (panels.spec.ts, link-actions.spec.ts). Enquire is Auto with nothing configured: the default.
    _id: 'panel-enquire',
    _type: 'panel',
    title: 'Enquire now',
    slug: { _type: 'slug', current: 'enquire' },
    content: [panelText('Tell us what you need and we will reply within two days.')],
  },
  {
    _id: 'panel-hours',
    _type: 'panel',
    title: 'Opening hours',
    presentation: 'side',
    width: 'narrow',
    content: [panelText('Monday to Friday, 9 am to 5 pm.')],
  },
  {
    _id: 'panel-story',
    _type: 'panel',
    title: 'Our story',
    presentation: 'fullscreen',
    content: [
      panelText(
        ...Array.from({ length: 10 }, () =>
          'A paragraph of the story, long enough to scroll. '.repeat(8),
        ),
      ),
    ],
  },
  {
    _id: 'panel-message',
    _type: 'panel',
    title: 'Send us a message',
    presentation: 'centred',
    content: [
      panelText('We read every message.'),
      { _key: key(), _type: 'panelForm', form: ref('form-contact') },
    ],
  },
  {
    _id: 'page-panels',
    _type: 'page',
    title: 'Panels',
    slug: { _type: 'slug', current: 'panels' },
    seo: { _type: 'seo', metaDescription: 'Buttons that open panels over the page.' },
    pageBuilder: [
      {
        _key: 'panels-hero',
        _type: 'hero',
        title: 'Panels',
        description: 'Buttons that open a pop-up over the page.',
        ctas: [
          cta('Open enquiry', panel('panel-enquire', '/about')),
          cta('Opening hours', panel('panel-hours', '/about'), 'secondary'),
          cta('Our story', panel('panel-story', '/about'), 'secondary'),
          cta('Message us', panel('panel-message', '/contact'), 'secondary'),
        ],
      },
      {
        _key: 'panels-text',
        _type: 'richText',
        body: [
          block(
            [
              'Prefer words? ',
              { _key: key(), _type: 'span', text: 'Enquire in the text', marks: ['panel-link'] },
              '.',
            ],
            { markDefs: [{ _key: 'panel-link', ...panel('panel-enquire', '/about') }] },
          ),
          ...Array.from({ length: 14 }, () =>
            block(['A paragraph of copy so the page is long enough to scroll. '.repeat(12)]),
          ),
        ],
      },
    ],
  },
  {
    _id: 'page-link-actions',
    _type: 'page',
    title: 'Link actions',
    slug: { _type: 'slug', current: 'link-actions' },
    seo: { _type: 'seo', metaDescription: 'Links that jump to a section or open a panel.' },
    pageBuilder: [
      {
        _key: 'link-actions-hero',
        _type: 'hero',
        title: 'Link actions',
        description: 'Buttons that do more than go to a page.',
        ctas: [
          cta('Jump to details', anchor('details')),
          cta('Open enquiry', panel('panel-enquire', '/about'), 'secondary'),
        ],
      },
      {
        _key: 'link-actions-booking',
        _type: 'ctaBanner',
        title: 'Ready when you are',
        tone: 'dark',
        ctas: [cta('Book a visit', booking('/about'))],
      },
      {
        _key: 'link-actions-spacer',
        _type: 'richText',
        body: [
          block(['Lead-in copy'], { style: 'h2' }),
          ...Array.from({ length: 12 }, () =>
            block(['A paragraph of copy so the page is long enough to scroll. '.repeat(12)]),
          ),
        ],
      },
      {
        _key: 'link-actions-details',
        _type: 'richText',
        style: { _type: 'sectionStyle', anchorId: 'details' },
        body: [block(['The details'], { style: 'h2' }), block(['This is where the link lands.'])],
      },
    ],
  },
  {
    _id: 'shared-promo',
    _type: 'sharedSection',
    title: 'Promo banner',
    section: [
      {
        _key: key(),
        _type: 'ctaBanner',
        title: 'Shared promo banner',
        text: 'Edited once, shown on every page that uses it.',
        tone: 'dark',
        ctas: [cta('See the promo', internal('page-about'))],
      },
    ],
  },
  {
    // Reaches a section through a reference; it has no hero, so the title is the hidden <h1>.
    _id: 'page-shared',
    _type: 'page',
    title: 'Shared',
    slug: { _type: 'slug', current: 'shared' },
    pageBuilder: [
      {
        _key: key(),
        _type: 'richText',
        body: [block(['Content before the shared section.'])],
      },
      { _key: 'shared-ref', ...ref('shared-promo') },
      // Points at a missing document: skipped, not an error.
      { _key: key(), ...ref('does-not-exist') },
    ],
  },
  {
    // A shared section that is members-only: the page that references it must not carry its text.
    _id: 'shared-members',
    _type: 'sharedSection',
    title: 'Members banner',
    section: [
      {
        _key: key(),
        _type: 'ctaBanner',
        access: 'members',
        title: 'Secret shared banner',
        text: 'Secret shared banner text.',
        tone: 'dark',
        ctas: [cta('Secret shared action', internal('page-about'))],
      },
    ],
  },
  {
    // Members-only page: nothing of its sections may reach an anonymous visitor. Starts with a hero.
    _id: 'page-members',
    _type: 'page',
    title: 'Members area',
    slug: { _type: 'slug', current: 'members' },
    access: 'members',
    seo: { _type: 'seo', metaDescription: 'Secret members description.' },
    pageBuilder: [
      {
        _key: key(),
        _type: 'hero',
        title: 'Secret members hero',
        description: 'Secret members hero text.',
      },
      { _key: key(), _type: 'richText', body: [block(['Secret members page content.'])] },
    ],
  },
  {
    // Sections with a motion preset and an anchor (tests/e2e/section-style.spec.ts). noIndex keeps it
    // out of the sitemap and search.
    _id: 'page-style-motion',
    _type: 'page',
    title: 'Section style motion',
    slug: { _type: 'slug', current: 'style-motion' },
    seo: { _type: 'seo', noIndex: true },
    pageBuilder: [
      {
        _key: 'motion-first',
        _type: 'richText',
        style: { _type: 'sectionStyle', motion: 'reveal', anchorId: 'first' },
        body: [block(['First section, never animated'], { style: 'h2' })],
      },
      {
        _key: 'motion-reveal',
        _type: 'richText',
        style: { _type: 'sectionStyle', motion: 'reveal', anchorId: 'reveal' },
        body: [block(['Revealed'], { style: 'h2' }), block(['Fades up once in view.'])],
      },
      {
        _key: 'motion-stagger',
        _type: 'featuresGrid',
        style: { _type: 'sectionStyle', motion: 'stagger', anchorId: 'stagger' },
        title: 'Staggered',
        intro: 'Each part follows the one before.',
        columns: 2,
        items: [1, 2].map((i) => ({ _key: key(), title: `Feature ${i}`, text: 'Text.' })),
      },
      {
        _key: 'motion-parallax',
        _type: 'richText',
        style: { _type: 'sectionStyle', motion: 'parallax', tone: 'inverse' },
        body: [block(['Parallax is static for now'], { style: 'h2' })],
      },
    ],
  },
  {
    // The animation presets and their Advanced options (tests/e2e/motion-presets.spec.ts). noIndex
    // keeps it out of the sitemap and search. The first section plays "On load"; the spacers keep
    // the rest below the fold; everything else plays as it scrolls into view.
    _id: 'page-motion-presets',
    _type: 'page',
    title: 'Animation presets',
    slug: { _type: 'slug', current: 'motion-presets' },
    seo: { _type: 'seo', noIndex: true },
    pageBuilder: [
      {
        _key: 'presets-first',
        _type: 'richText',
        style: {
          _type: 'sectionStyle',
          motion: 'slide',
          motionTrigger: 'load',
          motionDirection: 'up',
          anchorId: 'first',
        },
        body: [block(['First section, plays on load'], { style: 'h2' })],
      },
      {
        _key: 'presets-first-still',
        _type: 'richText',
        style: { _type: 'sectionStyle', motion: 'none', spacing: 'spacious' },
        body: [
          block(['Spacer'], { style: 'h2' }),
          ...Array.from({ length: 14 }, () => block(['Space to scroll through. '.repeat(10)])),
        ],
      },
      ...[
        ['subtle', { motion: 'subtle' }],
        ['fade', { motion: 'fade' }],
        ['slide', { motion: 'slide', motionDirection: 'end' }],
        [
          'custom',
          {
            motion: 'reveal',
            motionCustom: true,
            motionDurationMs: 1500,
            motionDistancePx: 60,
            motionEasing: 'linear',
            motionThreshold: 50,
          },
        ],
        // Left over from another preset: Direction means nothing to Subtle, so it must not apply.
        ['leftover', { motion: 'subtle', motionDirection: 'end', motionIntensity: 'bold' }],
      ].flatMap(([id, style]) => [
        {
          _key: `presets-${id}`,
          _type: 'richText',
          style: { _type: 'sectionStyle', anchorId: id, ...style },
          body: [block([`Preset ${id}`], { style: 'h2' }), block(['Body text. '.repeat(6)])],
        },
        {
          _key: `presets-space-${id}`,
          _type: 'richText',
          style: { _type: 'sectionStyle', motion: 'none', spacing: 'spacious' },
          body: [
            block(['Space'], { style: 'h2' }),
            ...Array.from({ length: 14 }, () => block(['Space to scroll through. '.repeat(10)])),
          ],
        },
      ]),
      {
        _key: 'presets-float',
        _type: 'mediaText',
        title: 'Floating picture',
        body: [block(['The picture drifts; the text stays put.'])],
        image: image('Floating picture'),
        imagePosition: 'right',
        style: { _type: 'sectionStyle', motion: 'float', anchorId: 'float' },
      },
      {
        _key: 'presets-space-float',
        _type: 'richText',
        style: { _type: 'sectionStyle', motion: 'none', spacing: 'spacious' },
        body: [
          block(['Space'], { style: 'h2' }),
          ...Array.from({ length: 14 }, () => block(['Space to scroll through. '.repeat(10)])),
        ],
      },
      {
        _key: 'presets-parallax',
        _type: 'mediaText',
        title: 'Strong parallax picture',
        body: [block(['Body text beside the picture.'])],
        image: image('Parallax picture'),
        imagePosition: 'left',
        style: {
          _type: 'sectionStyle',
          motion: 'parallaxStrong',
          motionIntensity: 'bold',
          anchorId: 'parallax-strong',
        },
      },
      {
        _key: 'presets-parallax-subtle',
        _type: 'mediaText',
        title: 'Subtle parallax picture',
        body: [block(['Body text beside the picture.'])],
        image: image('Parallax picture'),
        imagePosition: 'left',
        style: { _type: 'sectionStyle', motion: 'parallax', anchorId: 'parallax-subtle' },
      },
    ],
  },
  {
    // Public page with members-only sections: a plain one and a shared one between public ones.
    _id: 'page-mixed',
    _type: 'page',
    title: 'Mixed access',
    slug: { _type: 'slug', current: 'mixed' },
    pageBuilder: [
      { _key: key(), _type: 'richText', body: [block(['Public intro on the mixed page.'])] },
      {
        _key: key(),
        _type: 'richText',
        access: 'members',
        body: [block(['Secret members section content.'])],
      },
      { _key: 'members-ref', ...ref('shared-members') },
      { _key: key(), _type: 'richText', body: [block(['Public outro on the mixed page.'])] },
    ],
  },
  {
    // The first section is a members-only hero: the page still needs exactly one <h1>.
    _id: 'page-mixed-hero',
    _type: 'page',
    title: 'Members hero page',
    slug: { _type: 'slug', current: 'mixed-hero' },
    pageBuilder: [
      { _key: key(), _type: 'hero', access: 'members', title: 'Secret first hero' },
      { _key: key(), _type: 'richText', body: [block(['Public text under the hero.'])] },
    ],
  },
  stripePrice('price_Starter1', 'Starter', 900, 'usd', 'month'),
  stripePrice('price_Pro1', 'Pro', 2900, 'usd', 'month'),
  // A name that editors override on the plan, a non-dollar currency and a yearly interval.
  stripePrice('price_Team1', 'Team (yearly)', 29000, 'eur', 'year'),
  // One-time, in a zero-decimal currency: the amount is whole yen, not hundredths.
  stripePrice('price_Life1', 'Lifetime', 50000, 'jpy', null),
  // Archived at Stripe: the plan that references it is left out, and checkout refuses it.
  stripePrice('price_Old1', 'Retired', 100, 'usd', 'month', { active: false }),
  {
    _id: 'page-pricing',
    _type: 'page',
    title: 'Pricing',
    slug: { _type: 'slug', current: 'pricing' },
    pageBuilder: [
      {
        _key: key(),
        _type: 'pricingTable',
        title: 'Choose your plan',
        intro: 'Prices are kept in step with Stripe.',
        plans: [
          plan('price_Starter1', {
            features: ['One project', 'Email support'],
            ctaLabel: 'Start small',
          }),
          plan('price_Pro1', {
            features: ['Unlimited projects', 'Priority support', 'Custom domains'],
            highlighted: true,
          }),
          plan('price_Team1', { name: 'Team', features: ['Everything in Pro', 'Ten seats'] }),
          plan('price_Life1', { features: ['Pay once, use forever'] }),
          plan('price_Old1', { name: 'Retired plan' }),
        ],
      },
    ],
  },
  {
    // Every field type, required and optional, for the form tests.
    _id: 'form-contact',
    _type: 'form',
    title: 'Contact form',
    submitLabel: 'Send message',
    successMessage: 'Thanks, Ann! We will reply within two days.',
    recipientEmail: 'inbox@example.com',
    fields: [
      formField('Your name', 'name', 'text', { required: true }),
      formField('Email address', 'email', 'email', { required: true }),
      formField('Phone number', 'phone', 'tel'),
      formField('Topic', 'topic', 'select', {
        required: true,
        options: ['Sales', 'Support', 'Something else'],
      }),
      formField('Message', 'message', 'textarea', { required: true }),
      formField('I agree to be contacted', 'consent', 'checkbox', { required: true }),
      formField('Send me the newsletter', 'newsletter', 'checkbox'),
    ],
  },
  {
    _id: 'page-contact',
    _type: 'page',
    title: 'Contact',
    slug: { _type: 'slug', current: 'contact' },
    pageBuilder: [
      {
        _key: key(),
        _type: 'formSection',
        title: 'Get in touch',
        text: 'We usually reply within two days.',
        form: ref('form-contact'),
      },
    ],
  },
  {
    _id: 'page-newsletter',
    _type: 'page',
    title: 'Newsletter',
    slug: { _type: 'slug', current: 'newsletter' },
    pageBuilder: [
      {
        _key: key(),
        _type: 'newsletterSignup',
        title: 'Stay in the loop',
        text: 'One email a month, no spam.',
        submitLabel: 'Subscribe',
        successMessage: 'Thanks! Check your inbox to confirm.',
      },
    ],
  },
  {
    _id: IMAGE_ASSET_ID,
    _type: 'sanity.imageAsset',
    url: 'https://cdn.sanity.io/images/test/test/0123456789abcdef0123456789abcdef01234567-1200x630.png',
    metadata: { dimensions: { width: 1200, height: 630 } },
  },
  {
    _id: LOGO_ASSET_ID,
    _type: 'sanity.imageAsset',
    url: 'https://cdn.sanity.io/images/test/test/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-400x400.png',
    metadata: { lqip: LQIP, hasAlpha: true, dimensions: { width: 400, height: 400 } },
  },
  {
    _id: PHOTO_ASSET_ID,
    _type: 'sanity.imageAsset',
    url: 'https://cdn.sanity.io/images/test/test/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb-800x600.jpg',
    metadata: { lqip: LQIP, hasAlpha: false, dimensions: { width: 800, height: 600 } },
  },
  {
    _id: PATTERN_ASSET_ID,
    _type: 'sanity.imageAsset',
    url: 'https://cdn.sanity.io/images/test/test/fedcba9876543210fedcba9876543210fedcba98-160x120.png',
    metadata: { dimensions: { width: 160, height: 120 } },
  },
  {
    _id: VIDEO_ASSET_ID,
    _type: 'sanity.fileAsset',
    url: 'https://cdn.sanity.io/files/test/test/0123456789abcdef0123456789abcdef01234567.mp4',
    mimeType: 'video/mp4',
    size: 2_000_000,
  },
  {
    _id: CAPTIONS_ASSET_ID,
    _type: 'sanity.fileAsset',
    url: 'https://cdn.sanity.io/files/test/test/89abcdef0123456789abcdef0123456789abcdef.vtt',
    mimeType: 'text/vtt',
    size: 400,
  },
  {
    // An approved custom frame (image design, tests/e2e/framed-image.spec.ts): the specs stand in for the CDN file.
    _id: FRAME_ASSET_ID,
    _type: 'sanity.fileAsset',
    url: FRAME_URL,
    mimeType: 'image/svg+xml',
    size: 420,
  },
  {
    _id: 'frame-leaf',
    _type: 'frame',
    title: 'Leaf border',
    svg: fileRef(FRAME_ASSET_ID),
    _updatedAt: UPDATED,
  },
  {
    // Has its own share image: no generated one may be added next to it.
    _id: 'page-own-image',
    _type: 'page',
    title: 'Own image',
    slug: { _type: 'slug', current: 'own-image' },
    seo: {
      _type: 'seo',
      ogImage: {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: IMAGE_ASSET_ID,
        },
      },
    },
    pageBuilder: [{ _key: key(), _type: 'richText', body: [block(['Page with a share image.'])] }],
  },
  {
    // Too long for the generated share image's three lines.
    _id: 'page-long-title',
    _type: 'page',
    title:
      'A very long page title that keeps going well past what three lines of a share image can hold, '
        .repeat(3)
        .trim(),
    slug: { _type: 'slug', current: 'long-title' },
    pageBuilder: [{ _key: key(), _type: 'richText', body: [block(['Page with a long title.'])] }],
  },
  {
    _id: 'page-services',
    _type: 'page',
    title: 'Services',
    slug: { _type: 'slug', current: 'services' },
    seo: { _type: 'seo', metaDescription: 'What we do for clients.' },
    pageBuilder: [{ _key: key(), _type: 'richText', body: [block(['Our services.'])] }],
  },
  {
    // Hidden from search engines, so it is left out of the sitemap and /llms.txt.
    _id: 'page-private',
    _type: 'page',
    title: 'Private',
    slug: { _type: 'slug', current: 'private' },
    seo: { _type: 'seo', metaDescription: 'Not for search.', noIndex: true },
    pageBuilder: [{ _key: key(), _type: 'richText', body: [block(['Not listed anywhere.'])] }],
  },
  {
    // Nested under "services"; "services/web" has no page, so the trail skips that segment.
    _id: 'page-web-design',
    _type: 'page',
    title: 'Web design',
    slug: { _type: 'slug', current: 'services/web/design' },
    pageBuilder: [{ _key: key(), _type: 'richText', body: [block(['Web design services.'])] }],
  },
  {
    _id: 'author-ann',
    _type: 'author',
    name: 'Ann Author',
    image: image(''),
    bio: 'Ann writes about testing.',
  },
  {
    _id: 'category-news',
    _type: 'category',
    title: 'News',
    slug: { _type: 'slug', current: 'news' },
  },
  {
    _id: 'category-guides',
    _type: 'category',
    title: 'Guides',
    slug: { _type: 'slug', current: 'guides' },
  },
  {
    // No posts: it must not appear in the category filter.
    _id: 'category-empty',
    _type: 'category',
    title: 'Empty',
    slug: { _type: 'slug', current: 'empty' },
  },
  ...blogPosts,
  {
    _id: 'r1',
    _type: 'redirect',
    source: '/About-Us.html',
    destination: '/about',
    permanent: true,
  },
  {
    _id: 'r2',
    _type: 'redirect',
    source: '/promo/',
    destination: 'https://example.com/sale',
    permanent: false,
  },
  {
    // The page A/B tests change: the experiment's variant swaps its headline (see `variantDocuments`).
    _id: 'page-ab-test',
    _type: 'page',
    title: 'AB test page',
    slug: { _type: 'slug', current: 'ab-test' },
    pageBuilder: [abHero('Control headline')],
  },
  {
    // Stopped by default; tests/e2e/experiments.spec.ts starts it. Variant ids are the keys of
    // `variantDocuments`.
    _id: 'experiment-headline',
    _type: 'experiment',
    name: 'Headline test',
    active: false,
    controlWeight: 50,
    variants: [{ _key: 'v1', _type: 'experimentVariant', variantId: 'bold', weight: 50 }],
  },
  {
    // Brand gradients only, so sections can pick one (README, "Section backgrounds"); no colour is
    // set, so the design is tokens.json's. The `designSettingsVariants` below replace this document.
    _id: 'designSettings',
    _type: 'designSettings',
    gradients: [
      { _key: 'g1', name: 'Forest dusk', angle: 135, stops: ['#0b3d2e', '#1b2a3b'] },
      { _key: 'g2', name: 'Morning mist', angle: 180, stops: ['#f0f9ff', '#e0f2fe'] },
    ],
  },
  {
    // Sections with a gradient and a picture, to test layers, lazy loading and the first section
    // (tests/e2e/section-background.spec.ts). noIndex keeps it out of the sitemap and search.
    _id: 'page-style-background',
    _type: 'page',
    title: 'Section backgrounds',
    slug: { _type: 'slug', current: 'style-background' },
    seo: { _type: 'seo', noIndex: true },
    pageBuilder: [
      {
        _key: 'bg-first',
        _type: 'richText',
        style: {
          _type: 'sectionStyle',
          tone: 'inverse',
          anchorId: 'bg-first',
          image: image(''),
          overlay: 'medium',
        },
        body: [block(['Picture on the first section'], { style: 'h2' })],
      },
      {
        _key: 'bg-second',
        _type: 'richText',
        style: {
          _type: 'sectionStyle',
          tone: 'surface',
          anchorId: 'bg-second',
          image: image(''),
          overlay: 'strong',
        },
        body: [block(['Picture further down'], { style: 'h2' })],
      },
      {
        _key: 'bg-gradient',
        _type: 'richText',
        style: {
          _type: 'sectionStyle',
          tone: 'inverse',
          anchorId: 'bg-gradient',
          gradient: 'forest-dusk',
        },
        body: [block(['A brand gradient'], { style: 'h2' })],
      },
      {
        _key: 'bg-removed',
        _type: 'richText',
        style: {
          _type: 'sectionStyle',
          tone: 'alt',
          anchorId: 'bg-removed',
          gradient: 'no-longer-defined',
        },
        body: [block(['A gradient that left Design settings'], { style: 'h2' })],
      },
      {
        _key: 'bg-none',
        _type: 'richText',
        style: { _type: 'sectionStyle', tone: 'accent', anchorId: 'bg-none' },
        body: [block(['No picture, no gradient'], { style: 'h2' })],
      },
    ],
  },
].map((doc) => ({ ...doc, _updatedAt: UPDATED }))

/**
 * Brand colours the fake Content Lake can serve as the `designSettings` singleton while it runs
 * (tests/e2e/design-settings.spec.ts). The fixture has none, so the default design is tokens.json's.
 * `light` is a sample palette with a deep green Primary; `dark` adds the dark appearance.
 */
export const SAMPLE_PRIMARY = '#0b6e4f'
export const designSettingsVariants = {
  light: {
    _id: 'designSettings',
    _type: 'designSettings',
    appearance: 'light',
    primary: SAMPLE_PRIMARY,
    secondary: '#e4572e',
    highlight: '#ffd166',
    gradients: [{ _key: 'g1', name: 'Forest dusk', angle: 135, stops: ['#0b6e4f', '#1b3a4b'] }],
    _updatedAt: UPDATED,
  },
  dark: {
    _id: 'designSettings',
    _type: 'designSettings',
    appearance: 'dark',
    primary: '#7ad9b4',
    secondary: '#f2a07b',
    highlight: '#ffd166',
    _updatedAt: UPDATED,
  },
}

/**
 * Field changes the fake Content Lake can apply to the published Name, logo & icon document while it runs
 * (tests/e2e/ai-crawlers.spec.ts): the fixture above allows AI crawlers, this one switches them off.
 */
export const aiCrawlersBlocked = { allowAiCrawlers: false }

/**
 * The same, for the Browser icon (tests/e2e/browser-icon.spec.ts): the editor uploaded a square PNG
 * and chose small padding on a light background. The asset itself is never fetched by the tests;
 * the site only builds CDN URLs from its id.
 */
export const customBrowserIcon = {
  browserIcon: {
    _type: 'browserIcon',
    choice: 'upload',
    image: {
      _type: 'image',
      asset: {
        _type: 'reference',
        _ref: 'image-0123456789abcdef0123456789abcdef01234567-1024x1024-png',
      },
    },
    padding: 'small',
    background: 'light',
  },
}

/**
 * A "release" version of the About page, as the Content Lake stores it: a document with
 * `_id: versions.<release>.<id>`. Only served when the request's perspective names the release.
 */
// Keep in sync with RELEASE_ID in tests/e2e/constants.ts (this file is plain .mjs, run by Node).
const RELEASE_ID = 'rSummer'

export const releaseVersions = [
  {
    _id: `versions.${RELEASE_ID}.page-about`,
    _type: 'page',
    title: 'About (Summer release)',
    slug: { _type: 'slug', current: 'about' },
    pageBuilder: [
      {
        _key: key(),
        _type: 'richText',
        body: [block(['Only in the Summer release.'], { style: 'h2' })],
      },
    ],
    _updatedAt: UPDATED,
  },
]

/** Fields the fake Content Lake applies to the experiment while it runs (tests/e2e/experiments.spec.ts). */
export const experimentRunning = { active: true }

/**
 * Content variants, as the Content Lake serves them: a request with `variant=<id>` gets these
 * documents in place of the base ones with the same `_id`.
 */
export const variantDocuments = {
  bold: [
    {
      _id: 'page-ab-test',
      _type: 'page',
      title: 'AB test page',
      slug: { _type: 'slug', current: 'ab-test' },
      pageBuilder: [abHero('Variant headline')],
      _updatedAt: UPDATED,
    },
  ],
}

/**
 * Every section type and each of its variants, once, on a page of its own: the section gallery
 * (src/app/section-gallery) renders it and tests/e2e/visual.spec.ts takes one screenshot per
 * section. A section's `_key` is its id and names its baseline image, so renaming one means
 * refreshing that baseline (`npm run test:e2e:update`). Last in the file so the keys above stay put.
 */
const galleryFeatures = (columns) => ({
  _key: `features-grid-${columns}-columns`,
  _type: 'featuresGrid',
  title: `Features in ${columns} columns`,
  intro: 'A short introduction above the grid.',
  columns,
  items: Array.from({ length: columns * 2 }, (_, i) => ({
    _key: key(),
    _type: 'featureItem',
    title: `Feature ${i + 1}`,
    text: 'Text.',
    icon: image(''),
  })),
})
const galleryMediaText = (id, title, extra) => ({
  _key: `media-text-${id}`,
  _type: 'mediaText',
  eyebrow: 'Eyebrow',
  title,
  body: [block(['Body text beside the picture, long enough to wrap onto a second line or two.'])],
  ctas: [cta('Read more', internal('page-about'))],
  ...extra,
})
const galleryBanner = (tone) => ({
  _key: `cta-banner-${tone}`,
  _type: 'ctaBanner',
  title: `Call to action, ${tone} tone`,
  text: 'Banner text.',
  tone,
  ctas: [
    cta('Get started', internal('page-about')),
    cta('Learn more', internal('page-about'), 'secondary'),
  ],
})

/** A gallery section with Design options set: one entry per tone and spacing (see "Section style" in the README). */
const styled = (id, section, style) => ({
  ...section,
  _key: id,
  style: { _type: 'sectionStyle', ...style },
})
const TONES = ['surface', 'alt', 'inverse', 'accent']
const SPACINGS = ['compact', 'spacious']
const styledVariants = (id, section) => [
  ...TONES.map((tone) => styled(`${id}-${tone}`, section, { tone, anchorId: `${id}-${tone}` })),
  ...SPACINGS.map((spacing) => styled(`${id}-${spacing}`, section, { spacing })),
]

/**
 * A hero's "Animate individual parts" with a different animation on every part (the ones a layout
 * does not have are ignored): used by the gallery and by the /hero-parts page. The heading and pictures
 * only move, because on the first section they may not start hidden, clipped or smaller (their LCP).
 */
const allParts = {
  enabled: true,
  eyebrowPreset: 'reveal',
  headingPreset: 'slide',
  descriptionPreset: 'slide',
  buttonsPreset: 'scale',
  buttonsDelay: 'long',
  slotPreset: 'fade',
  imagePreset: 'rise',
  backgroundPreset: 'rise',
}

/** One gallery entry per hero variant (see HERO_VARIANTS); the plain `hero` below has no variant set. */
const galleryHero = (id, extra) => ({
  _key: `hero-${id}`,
  _type: 'hero',
  eyebrow: 'Eyebrow',
  title: 'Welcome to Test Co',
  description: 'Hero description, long enough to wrap onto a second line on a phone.',
  ctas: [
    cta('About us', internal('page-about')),
    cta('Learn more', internal('page-about'), 'secondary'),
  ],
  backgroundImage: image(''),
  ...extra,
})

/**
 * Two sections for the gallery, one above the other: the upper has a bottom edge. The second key ends
 * in `--below`, which the gallery page reads as "render this in the same frame as the one before".
 */
const edgeText = (id, title) => ({
  _key: id,
  _type: 'richText',
  body: [block([title], { style: 'h2' }), block(['A paragraph of copy under the heading.'])],
})
const edgePair = (id, upper, below) => [
  styled(`edge-${id}`, edgeText(`edge-${id}`, 'Above the edge'), upper),
  styled(`edge-${id}--below`, edgeText(`edge-${id}--below`, 'Below the edge'), below),
]

/** Four figures that exercise the number format: grouping, decimals, a prefix and a suffix. */
/** Six distinct quotes (names Person 1 to 6), so a test can tell which slide is in view. */
const sliderQuotes = (id) =>
  Array.from({ length: 6 }, (_, n) => ({
    _key: `${id}-${n + 1}`,
    _type: 'testimonial',
    quote: `Quote number ${n + 1} from a happy customer.`,
    name: `Person ${n + 1}`,
    role: 'CEO',
    avatar: image(`${id}-${n + 1}`),
  }))

const statItems = (key) => [
  {
    _key: `${key}-projects`,
    _type: 'statItem',
    value: 12500,
    decimals: 0,
    suffix: '+',
    label: 'Projects delivered',
  },
  {
    _key: `${key}-rating`,
    _type: 'statItem',
    value: 4.9,
    decimals: 1,
    suffix: '/5',
    label: 'Average rating',
  },
  {
    _key: `${key}-revenue`,
    _type: 'statItem',
    value: 1.2,
    decimals: 1,
    prefix: '$',
    suffix: 'm',
    label: 'Raised for clients',
  },
  { _key: `${key}-years`, _type: 'statItem', value: 12, label: 'Years in business' },
]

/**
 * The hero's supporting slot (README, "Adding a hero slot"): each slot type in each hero preset, so the
 * layout, the placement and the tone are all seen. The stats bar is three figures, the badges three
 * labels (two with icons) and the logos six, the most the slot holds.
 */
const SLOT_TYPES = ['stats', 'badges', 'logos', 'launch']
const slotItem = (type, id) => {
  const _key = `${id}-slot`
  if (type === 'stats') return { _key, _type: 'statsBar', items: statItems(id).slice(0, 3) }
  if (type === 'badges') {
    return {
      _key,
      _type: 'badgeRow',
      badges: [
        { _key: `${id}-b1`, _type: 'badge', label: 'Locally owned', icon: 'heart' },
        { _key: `${id}-b2`, _type: 'badge', label: 'Free delivery', icon: 'check' },
        { _key: `${id}-b3`, _type: 'badge', label: 'Five-year warranty' },
      ],
    }
  }
  if (type === 'launch') {
    // Without the countdown, so the gallery needs no client code; /launch-date has it.
    return {
      _key,
      _type: 'launchDate',
      label: 'Opening',
      date: '2099-01-05',
      time: '09:30',
      countdown: false,
    }
  }
  return {
    _key,
    _type: 'logoRow',
    greyscale: true,
    logos: ['Acme', 'Globex', 'Initech', 'Umbrella', 'Hooli', 'Stark'].map((name) => ({
      _key: `${id}-${name}`,
      _type: 'logo',
      name,
      image: image(''),
    })),
  }
}
/** The six hero presets (HERO_PRESETS), as the fields they set, plus what each needs to look right. */
const SLOT_PRESETS = {
  'full-background': { extra: { variant: 'overlay' } },
  'split-right': { extra: { variant: 'split', imagePosition: 'right' } },
  'split-left': { extra: { variant: 'split', imagePosition: 'left' } },
  'centred-text': {
    extra: { variant: 'overlay', backgroundImage: undefined },
    style: { tone: 'surface' },
  },
  editorial: { extra: { variant: 'editorial', backgroundImage: undefined } },
  'image-with-panel': { extra: { variant: 'full-bleed' } },
}
const heroSlotGallery = SLOT_TYPES.flatMap((type) =>
  Object.entries(SLOT_PRESETS).map(([preset, { extra, style }]) => {
    const id = `slot-${type}-${preset}`
    const hero = galleryHero(id, { ...extra, supporting: [slotItem(type, id)] })
    return style ? styled(hero._key, hero, style) : hero
  }),
)
// Beside the text in Editorial, with the small picture too: the slot sits under it.
heroSlotGallery.push(
  galleryHero('slot-stats-editorial-inset', {
    variant: 'editorial',
    backgroundImage: undefined,
    secondaryImage: image(''),
    supporting: [slotItem('stats', 'slot-stats-editorial-inset')],
  }),
)

/** `count` pictures with alt text and, for every other one, a caption: "<id> picture 1" and so on. */
const galleryImages = (id, count) =>
  Array.from({ length: count }, (_, n) => ({
    ...image(`${id} picture ${n + 1}`),
    _key: `${id}-${n + 1}`,
    ...(n % 2 === 0 ? { caption: `Caption for ${id} picture ${n + 1}` } : {}),
  }))

/**
 * Links for the Link list gallery entries and the /links page (tests/e2e/link-list.spec.ts). The
 * featured one comes first; "Shop" and "Follow along" are groups; thumbnails only matter to the layouts
 * that draw them.
 */
const linkItem = (id, label, link, extra = {}) => ({
  _key: id,
  _type: 'linkItem',
  label,
  link,
  visibility: 'show',
  ...extra,
})
const galleryLinks = (prefix) => [
  linkItem(`${prefix}-book`, 'Book a consultation', external('https://example.com/book'), {
    description: 'Thirty minutes, free of charge',
    featured: true,
    icon: 'clock',
    thumbnail: image('Booking'),
  }),
  linkItem(`${prefix}-journal`, 'Read the journal', internal('page-about'), {
    description: 'Notes from the studio',
    icon: 'star',
    thumbnail: image('Journal'),
  }),
  linkItem(`${prefix}-shop`, 'Shop the range', external('https://example.com/shop'), {
    description: 'New this season',
    icon: 'bolt',
    group: 'Shop',
    thumbnail: image('Shop'),
  }),
  linkItem(`${prefix}-gift`, 'Gift cards', external('https://example.com/gift'), {
    icon: 'heart',
    group: 'Shop',
    thumbnail: image('Gift cards'),
  }),
  linkItem(`${prefix}-insta`, 'Follow on Instagram', external('https://instagram.com/testco'), {
    icon: 'leaf',
    group: 'Follow along',
    thumbnail: image('Instagram'),
  }),
]
const galleryProfile = {
  _type: 'object',
  name: 'Test Co',
  bio: 'Small-batch ceramics from the Inner West. Orders ship Australia-wide.',
  image: image('Test Co logo'),
}

const gallerySections = [
  {
    _key: 'hero',
    _type: 'hero',
    title: 'Welcome to Test Co',
    description: 'Hero description.',
    ctas: [
      cta('About us', internal('page-about')),
      cta('Learn more', internal('page-about'), 'secondary'),
    ],
    backgroundImage: image(''),
  },
  galleryHero('overlay', { variant: 'overlay' }),
  galleryHero('split-right', { variant: 'split', imagePosition: 'right' }),
  galleryHero('split-left', { variant: 'split', imagePosition: 'left' }),
  galleryHero('split-no-image', { variant: 'split', backgroundImage: undefined }),
  // Split options (README, "Hero presets"): proportions and image shapes. The right-hand picture
  // is the one that changes, so each also sits on the left once, where the columns swap.
  galleryHero('split-text-wide', { variant: 'split', proportion: 'text' }),
  galleryHero('split-image-wide-left', {
    variant: 'split',
    imagePosition: 'left',
    proportion: 'image',
  }),
  galleryHero('split-square', { variant: 'split', imageShape: 'square' }),
  galleryHero('split-circle', { variant: 'split', imageShape: 'circle' }),
  galleryHero('split-arch-left', { variant: 'split', imagePosition: 'left', imageShape: 'arch' }),
  // The Image design replaces the older Image shape (hero-split.ts): it wins, and a hero without one keeps its shape.
  galleryHero('split-framed', {
    variant: 'split',
    imageDesign: imageDesign({ appearance: 'framed', frame: 'organic-brush' }),
  }),
  galleryHero('split-design-circle', {
    variant: 'split',
    imageShape: 'arch',
    imageDesign: imageDesign({ appearance: 'circle' }),
  }),
  // A hotspot at the lower left: the crop to 4:3 keeps it in view (object-position, hero-variants.spec.ts).
  galleryHero('split-hotspot', {
    variant: 'split',
    backgroundImage: { ...image(''), hotspot: { x: 0.2, y: 0.8, width: 0.2, height: 0.2 } },
  }),
  // The "Centred text" preset: the Full background layout on the page colour, with no picture.
  styled(
    'hero-centred-text',
    galleryHero('centred-text', { variant: 'overlay', backgroundImage: undefined }),
    { tone: 'surface' },
  ),
  galleryHero('editorial', { variant: 'editorial', backgroundImage: undefined }),
  galleryHero('editorial-inset', {
    variant: 'editorial',
    backgroundImage: undefined,
    secondaryImage: image(''),
  }),
  galleryHero('full-bleed', { variant: 'full-bleed' }),
  // Parallax backgrounds (README, "Motion"). The visual tests emulate reduced motion, so these show the still picture.
  styled('hero-parallax', galleryHero('parallax', { variant: 'overlay' }), { motion: 'parallax' }),
  styled(
    'hero-full-bleed-parallax',
    galleryHero('full-bleed-parallax', { variant: 'full-bleed' }),
    {
      motion: 'parallax',
    },
  ),
  // Animated parts (README, "Animating individual parts"). The visual tests emulate reduced motion, so
  // each shows its parts at rest: these baselines prove the wrappers change nothing about the layout.
  galleryHero('parts-overlay', {
    variant: 'overlay',
    supporting: [slotItem('badges', 'parts-overlay')],
    partMotion: allParts,
  }),
  // Fade, Reveal and Scale are ignored on the first section's heading and pictures: nothing wraps them.
  galleryHero('parts-ignored', {
    variant: 'split',
    partMotion: {
      enabled: true,
      headingPreset: 'reveal',
      imagePreset: 'scale',
      eyebrowPreset: 'fade',
    },
  }),
  galleryHero('parts-split', { variant: 'split', partMotion: allParts }),
  galleryHero('parts-split-circle', {
    variant: 'split',
    imageShape: 'circle',
    partMotion: { ...allParts, imagePreset: 'slide' },
  }),
  galleryHero('parts-split-parallax', {
    variant: 'split',
    imageShape: 'arch',
    partMotion: { enabled: true, imagePreset: 'parallax' },
  }),
  galleryHero('parts-editorial', {
    variant: 'editorial',
    backgroundImage: undefined,
    secondaryImage: image(''),
    supporting: [slotItem('stats', 'parts-editorial')],
    partMotion: allParts,
  }),
  galleryHero('parts-full-bleed', {
    variant: 'full-bleed',
    supporting: [slotItem('badges', 'parts-full-bleed')],
    partMotion: { ...allParts, backgroundPreset: 'parallax' },
  }),
  // Highlighted heading words (README, "Highlighting words in a heading"). The long heading wraps on a
  // phone, which is the case the gradient's box-decoration-break: clone exists for.
  galleryHero('heading-gradient', {
    variant: 'overlay',
    backgroundImage: undefined,
    title: undefined,
    heading: headingText('hero-heading-gradient', [
      'Websites that ',
      ['grow with your business', 'gradient', 'brand'],
      ' and look the part',
    ]),
  }),
  // A custom gradient (README, "Custom gradient colours"): three of the editor's own colours at 45
  // degrees, on a heading that wraps on a phone.
  galleryHero('heading-custom-gradient', {
    variant: 'overlay',
    backgroundImage: undefined,
    title: undefined,
    heading: headingText('hero-heading-custom-gradient', [
      'Stand out with ',
      [
        'colours of your own choosing',
        'gradient',
        'custom',
        { stops: ['#1d4ed8', '#7c3aed', '#be185d'], angle: 45 },
      ],
      ' in every heading',
    ]),
  }),
  styled(
    'hero-heading-highlight',
    galleryHero('heading-highlight', {
      variant: 'overlay',
      backgroundImage: undefined,
      title: undefined,
      heading: headingText('hero-heading-highlight', [
        'Make ',
        ['every word', 'highlight'],
        ' count with ',
        ['clear design', 'brand'],
      ]),
    }),
    { tone: 'surface' },
  ),
  {
    _key: 'rich-text',
    _type: 'richText',
    body: [
      block(['Rich text heading'], { style: 'h2' }),
      block(['A paragraph of copy.']),
      block(['A second paragraph.']),
    ],
  },
  galleryMediaText('image-left', 'Image on the left', {
    image: image('Picture'),
    imagePosition: 'left',
  }),
  galleryMediaText('image-right', 'Image on the right', {
    image: image('Picture'),
    imagePosition: 'right',
  }),
  galleryMediaText('no-image', 'Without an image', { imagePosition: 'right' }),
  // Image design (README, "Image design"): a shape, a frame and parallax inside a still frame. The
  // gallery has no MotionProvider and the baselines use reduced motion, so these show the still,
  // unscaled picture with its frame.
  ...[
    ['rounded', { appearance: 'rounded' }],
    ['circle', { appearance: 'circle' }],
    ['arch', { appearance: 'arch' }],
    ['framed', { appearance: 'framed' }],
    ['frame-double-line', { appearance: 'framed', frame: 'double-line' }],
    ['frame-offset-border', { appearance: 'framed', frame: 'offset-border' }],
    ['frame-organic-brush', { appearance: 'framed', frame: 'organic-brush' }],
    ['frame-corner-brackets', { appearance: 'framed', frame: 'corner-brackets' }],
    ['frame-custom', { appearance: 'framed', frame: 'custom', customFrame: ref('frame-leaf') }],
    [
      'frame-tweaked',
      { appearance: 'framed', frame: 'thin-line', frameColour: 'highlight', frameInset: 8 },
    ],
    ['parallax-subtle', { motion: 'subtle' }],
    ['parallax-medium', { appearance: 'framed', frame: 'thin-line', motion: 'medium' }],
    [
      'parallax-custom',
      {
        appearance: 'rounded',
        motion: 'subtle',
        custom: true,
        travel: 6,
        direction: 'up',
        scale: 1.12,
      },
    ],
  ].map(([id, design]) =>
    galleryMediaText(`image-${id}`, `Image design: ${id}`, {
      image: image('Picture'),
      imagePosition: 'right',
      imageDesign: imageDesign(design),
    }),
  ),
  galleryFeatures(2),
  galleryFeatures(3),
  galleryFeatures(4),
  {
    _key: 'logo-cloud',
    _type: 'logoCloud',
    title: 'Trusted by',
    logos: ['Acme', 'Globex', 'Initech'].map((name) => ({
      _key: key(),
      name,
      image: image(name),
    })),
  },
  {
    _key: 'testimonials',
    _type: 'testimonials',
    title: 'Testimonials',
    items: ['Alex', 'Sam'].map((name) => ({
      _key: key(),
      quote: 'Great.',
      name,
      role: 'CEO',
      avatar: image(name),
    })),
  },
  {
    _key: 'faq',
    _type: 'faq',
    title: 'FAQ',
    intro: 'Answers to common questions.',
    items: [
      { _key: key(), question: 'A question?', answer: [block(['An answer.'])] },
      { _key: key(), question: 'Another question?', answer: [block(['Another answer.'])] },
    ],
  },
  galleryBanner('brand'),
  galleryBanner('dark'),
  galleryBanner('light'),
  {
    _key: 'form-section',
    _type: 'formSection',
    title: 'Get in touch',
    text: 'We usually reply within two days.',
    form: ref('form-contact'),
  },
  {
    _key: 'pricing-table',
    _type: 'pricingTable',
    title: 'Choose your plan',
    intro: 'Prices are kept in step with Stripe.',
    plans: [
      plan('price_Starter1', { features: ['One project', 'Email support'] }),
      plan('price_Pro1', {
        features: ['Unlimited projects', 'Priority support'],
        highlighted: true,
      }),
      plan('price_Team1', { name: 'Team', features: ['Everything in Pro', 'Ten seats'] }),
    ],
  },
  {
    _key: 'newsletter-signup',
    _type: 'newsletterSignup',
    title: 'Stay in the loop',
    text: 'One email a month, no spam.',
    submitLabel: 'Subscribe',
    successMessage: 'Thanks! Check your inbox to confirm.',
  },
  ...styledVariants('features-grid-style', galleryFeatures(3)),
  ...styledVariants(
    'media-text-style',
    galleryMediaText('style', 'Design options', {
      image: image('Picture'),
      imagePosition: 'right',
    }),
  ),
  styled(
    'media-text-parallax',
    galleryMediaText('parallax', 'Parallax picture', {
      image: image('Picture'),
      imagePosition: 'right',
    }),
    { motion: 'parallax' },
  ),
  styled(
    'rich-text-style-narrow',
    {
      _type: 'richText',
      body: [
        block(['Narrow and centred'], { style: 'h2' }),
        block(['A paragraph of copy in a narrower column, centred.']),
      ],
    },
    { width: 'narrow', align: 'center' },
  ),
  // Section backgrounds (README, "Section backgrounds"): brand gradients, and a picture with each overlay.
  styled('features-grid-gradient-inverse', galleryFeatures(3), {
    tone: 'inverse',
    gradient: 'forest-dusk',
  }),
  styled('features-grid-gradient-surface', galleryFeatures(3), {
    tone: 'surface',
    gradient: 'morning-mist',
  }),
  ...['none', 'light', 'medium', 'strong'].map((overlay) =>
    styled(
      `media-text-background-${overlay}`,
      galleryMediaText(`background-${overlay}`, `Picture behind, ${overlay} overlay`, {
        image: image('Picture'),
        imagePosition: 'right',
      }),
      { tone: 'inverse', image: image(''), overlay },
    ),
  ),
  styled(
    'media-text-background-surface-default',
    galleryMediaText('background-surface-default', 'Picture behind, light background', {
      image: image('Picture'),
      imagePosition: 'right',
    }),
    { tone: 'surface', image: image('') },
  ),
  styled(
    'media-text-background-inverse-default',
    galleryMediaText('background-inverse-default', 'Picture behind, dark background', {
      image: image('Picture'),
      imagePosition: 'right',
    }),
    { tone: 'inverse', image: image('') },
  ),
  // Section dividers (README, "Section dividers"): each entry is the upper section, followed by the
  // one below it (key ending `--below`), which the gallery renders in the same frame.
  ...edgePair('wave-flat', { tone: 'inverse', edge: 'wave' }, { tone: 'alt' }),
  ...edgePair(
    'wave-gradient-image',
    { tone: 'inverse', gradient: 'forest-dusk', edge: 'wave' },
    { tone: 'inverse', image: image(''), overlay: 'medium' },
  ),
  ...edgePair(
    'layered-accent-line',
    { tone: 'inverse', edge: 'layered', edgeAccent: 'highlight' },
    { tone: 'surface' },
  ),
  ...edgePair('diagonal', { tone: 'accent', edge: 'diagonal' }, { tone: 'surface' }),
  ...edgePair('curve', { tone: 'alt', edge: 'curve', edgeAccent: 'accent' }, { tone: 'inverse' }),
  ...edgePair('arch', { tone: 'inverse', edge: 'arch' }, { tone: 'surface' }),
  ...edgePair(
    'wave-large-flip',
    { tone: 'accent', edge: 'wave', edgeHeight: 'large', edgeFlip: true },
    { tone: 'surface' },
  ),
  ...edgePair(
    'curve-invert',
    { tone: 'inverse', edge: 'curve', edgeInvert: true },
    { tone: 'alt' },
  ),
  ...edgePair(
    'wave-custom-heights',
    { tone: 'inverse', edge: 'wave', edgeHeightMobile: 24, edgeHeightDesktop: 140 },
    { tone: 'alt' },
  ),
  ...edgePair(
    'wave-spacious-compact',
    { tone: 'inverse', edge: 'wave', edgeHeight: 'small', spacing: 'spacious' },
    { tone: 'alt', spacing: 'compact' },
  ),
  // Stats (README, "Statistics"): both layouts with the default three figures and the formatting
  // options (grouping, decimals, prefix, suffix), then a dark six-figure grid with animation off.
  {
    _key: 'stats-inline',
    _type: 'stats',
    variant: 'inline',
    title: 'Numbers we are proud of',
    intro: 'A few figures from the last twelve years.',
    items: statItems('stats-inline'),
  },
  {
    _key: 'stats-cards',
    _type: 'stats',
    variant: 'cards',
    title: 'Results that speak for themselves',
    items: statItems('stats-cards'),
  },
  {
    _key: 'stats-cards-six',
    _type: 'stats',
    variant: 'cards',
    style: { _type: 'sectionStyle', tone: 'inverse', motion: 'none' },
    title: 'Six figures, no animation',
    items: [...statItems('stats-cards-six'), ...statItems('stats-cards-six-more')].slice(0, 6),
  },
  // Testimonials slider (README, "Slider"): six quotes, so it has several stops at every width.
  // The gallery has no MotionProvider, so it shows the layout only; tests/e2e/slider.spec.ts
  // drives the real thing on the /slider page.
  {
    _key: 'testimonials-slider',
    _type: 'testimonials',
    variant: 'slider',
    title: 'Kind words',
    items: sliderQuotes('testimonials-slider'),
  },
  {
    _key: 'testimonials-slider-inverse',
    _type: 'testimonials',
    variant: 'slider',
    style: { _type: 'sectionStyle', tone: 'inverse' },
    title: 'Kind words on dark',
    items: sliderQuotes('testimonials-slider-inverse').slice(0, 4),
  },
  ...heroSlotGallery,
  // Galleries (README, "Gallery"): twelve pictures so the grids have several rows, six for the slider.
  // The gallery has no MotionProvider, so the lightbox cannot be driven here; tests/e2e/gallery.spec.ts
  // opens it on the /gallery page.
  {
    _key: 'gallery-grid',
    _type: 'gallery',
    variant: 'grid',
    title: 'Our work',
    intro: 'A few recent projects.',
    columns: 3,
    images: galleryImages('gallery-grid', 12),
  },
  {
    _key: 'gallery-grid-four',
    _type: 'gallery',
    variant: 'grid',
    style: { _type: 'sectionStyle', tone: 'alt' },
    title: 'Four across',
    columns: 4,
    images: galleryImages('gallery-grid-four', 8),
  },
  {
    _key: 'gallery-grid-rounded',
    _type: 'gallery',
    variant: 'grid',
    title: 'Rounded corners',
    columns: 3,
    imageDesign: imageDesign({ appearance: 'rounded' }),
    images: galleryImages('gallery-grid-rounded', 3),
  },
  {
    _key: 'gallery-masonry',
    _type: 'gallery',
    variant: 'masonry',
    title: 'Masonry',
    intro: 'Pictures keep their own shape.',
    columns: 3,
    images: galleryImages('gallery-masonry', 9),
  },
  {
    _key: 'gallery-slider',
    _type: 'gallery',
    variant: 'slider',
    style: { _type: 'sectionStyle', tone: 'inverse' },
    title: 'Slider',
    columns: 3,
    images: galleryImages('gallery-slider', 6),
  },
  // Location reads the businessInfo document above. The default is address, contact and hours on cards.
  {
    _key: 'location',
    _type: 'location',
    title: 'Visit us',
    intro: 'Find us in Newtown, or call ahead.',
    showHours: true,
    showOpenNow: true,
    showContact: true,
    directionsLabel: 'Get directions',
  },
  {
    _key: 'location-image',
    _type: 'location',
    style: { _type: 'sectionStyle', tone: 'alt' },
    title: 'Find the shop',
    mapImage: image('A map of Newtown'),
    showHours: true,
    showOpenNow: true,
    showContact: true,
    directionsLabel: 'Get directions',
  },
  {
    _key: 'location-interactive',
    _type: 'location',
    title: 'Come and say hello',
    mapImage: image('A map of Newtown'),
    showHours: false,
    showContact: true,
    directionsLabel: 'Directions on Google Maps',
    interactiveMap: true,
  },
  {
    _key: 'location-address-only',
    _type: 'location',
    style: { _type: 'sectionStyle', tone: 'inverse' },
    title: 'Where we are',
    showHours: false,
    showContact: false,
    directionsLabel: 'Get directions',
  },
  // Team: everyone in order, a picked list (in the editor's order, skipping an unpublished pick), and the list layout.
  {
    _key: 'team-grid',
    _type: 'team',
    variant: 'grid',
    selection: 'all',
    title: 'Meet the team',
    text: 'The people who will look after you.',
  },
  {
    _key: 'team-grid-circle',
    _type: 'team',
    variant: 'grid',
    selection: 'picked',
    title: 'Portraits in circles',
    imageDesign: imageDesign({ appearance: 'circle' }),
    members: [
      { _key: 'pick-circle-dev', ...ref('teamMember-dev') },
      { _key: 'pick-circle-ann', ...ref('teamMember-ann') },
    ],
  },
  {
    _key: 'team-slider',
    _type: 'team',
    variant: 'slider',
    selection: 'picked',
    title: 'Our partners',
    members: [
      { _key: 'pick-dev', ...ref('teamMember-dev') },
      { _key: 'pick-ann', ...ref('teamMember-ann') },
      { _key: 'pick-ghost', ...ref('teamMember-unpublished') },
    ],
  },
  {
    _key: 'team-list',
    _type: 'team',
    variant: 'list',
    selection: 'all',
    title: 'Who we are',
  },
  videoSection('video-embed', {
    variant: 'embed',
    title: 'Watch our story',
    text: 'A short film about how we work.',
    source: 'youtube',
    url: VIDEO_URL.youtube,
  }),
  videoSection('video-embed-upload', {
    variant: 'embed',
    title: 'Behind the scenes',
    source: 'upload',
    file: fileRef(VIDEO_ASSET_ID),
    captions: fileRef(CAPTIONS_ASSET_ID),
    aspectRatio: '4:3',
  }),
  videoSection('video-ambient', {
    variant: 'ambient',
    title: 'Made in the studio',
    text: 'A quiet loop of the team at work.',
    file: fileRef(VIDEO_ASSET_ID),
  }),
  // Process (README, "Process timeline"): both layouts with four steps. The first step has a label
  // and a picture; the gallery has no MotionProvider, so the line shows fully drawn.
  {
    _key: 'process-vertical',
    _type: 'process',
    variant: 'vertical',
    title: 'How we work',
    intro: 'Four steps from first chat to launch.',
    steps: processSteps('process-vertical'),
  },
  {
    _key: 'process-alternating',
    _type: 'process',
    variant: 'alternating',
    title: 'From idea to launch',
    steps: processSteps('process-alternating'),
  },
  // Logo strip marquee: greyscale (the default) and full colour. One logo links, to check the copy's tab order.
  {
    _key: 'logo-cloud-marquee',
    _type: 'logoCloud',
    variant: 'marquee',
    title: 'Trusted by',
    logos: ['Acme', 'Globex', 'Initech', 'Umbrella', 'Hooli'].map((name, index) => ({
      _key: key(),
      name,
      image: image(name),
      ...(index === 0 && { url: 'https://example.com/acme' }),
    })),
  },
  {
    _key: 'logo-cloud-marquee-colour',
    _type: 'logoCloud',
    variant: 'marquee',
    logoColour: 'colour',
    title: 'Our partners',
    logos: ['Acme', 'Globex', 'Initech', 'Umbrella', 'Hooli'].map((name) => ({
      _key: key(),
      name,
      image: image(name),
    })),
  },
  // One entry per preset: Minimal, Cards, Editorial, Compact, Image-focused (Cards with large pictures)
  // and Glass rows (Minimal with the glass row style, over a background photo).
  // The fixed clock the visual tests pin (visual.spec.ts) is 16 Oct 2026, so schedules are stable.
  ...[
    ['stacked', 'standard', 'center'],
    ['cards', 'standard', 'center'],
    ['editorial', 'standard', 'start'],
    ['compact', 'standard', 'start'],
    ['image-focused', 'large', 'center'],
    ['glass-rows', 'standard', 'center'],
  ].map(([name, thumbnailSize, align]) => ({
    _key: `link-list-${name}`,
    _type: 'linkList',
    variant: ['image-focused', 'glass-rows'].includes(name)
      ? { 'image-focused': 'cards', 'glass-rows': 'stacked' }[name]
      : name,
    ...(name === 'glass-rows' && { rowStyle: 'glass', glassStrength: 'medium', showArrows: true }),
    thumbnailSize,
    style: {
      _type: 'sectionStyle',
      align,
      ...(name === 'glass-rows' && { image: image(''), overlay: 'none' }),
    },
    profile: galleryProfile,
    socialSource: 'business',
    links: galleryLinks(`ll-${name}`),
  })),
  // Service categories with the default look (a bullet in Primary), under a Glass rows profile.
  {
    _key: 'link-list-categories',
    _type: 'linkList',
    variant: 'stacked',
    rowStyle: 'glass',
    glassStrength: 'medium',
    thumbnailSize: 'standard',
    style: { _type: 'sectionStyle', align: 'center', image: image(''), overlay: 'none' },
    profile: {
      ...galleryProfile,
      categories: ['Bodywork', 'Breathwork', 'Movement', 'Retreats'],
      bio: 'Reconnect to your body and your nature.\n\nRemember what makes you feel alive!',
    },
    socialSource: 'business',
    links: galleryLinks('ll-categories'),
  },
  // Events: the gallery's own events are in 2099 and in the "Workshop" category, so nothing about them
  // changes with the date. Each section filters to that category.
  ...['list', 'agenda', 'featured'].map((name) => ({
    _key: `events-${name}`,
    _type: 'events',
    variant: name,
    title: 'What’s on',
    text: 'Workshops, talks and open days at the studio.',
    category: ref('eventCategory-workshop'),
    seeAllLink: external('https://example.com/events'),
    seeAllLabel: 'See all events',
  })),
  embedSection('embed', {
    title: 'Book a consultation',
    text: 'Tell us about your project and we will be in touch.',
    provider: 'typeform',
    url: EMBED_URL.typeform,
  }),
  // new-section:gallery
]

/**
 * The gallery sections' ids, in page order: one visual test and one baseline per id. A `--below`
 * section is drawn in the frame of the one before it (see edgePair), so it has no entry of its own.
 */
export const galleryIds = gallerySections
  .map((section) => section._key)
  .filter((id) => !id.endsWith('--below'))

/**
 * Statistics on a real page (tests/e2e/stats.spec.ts): a hero first, then a Stats section that counts
 * up (Reveal) and one with Animation None, each below the fold. Their figures are distinct and
 * formatted, so the HTML can be checked for them.
 */
/**
 * A real page whose hero carries a statistics slot (tests/e2e/hero-slot.spec.ts), for what the section
 * gallery cannot show: the slot joining the hero's stagger (the gallery has no MotionProvider), and
 * reduced motion.
 */
documents.push({
  _id: 'page-hero-slot',
  _type: 'page',
  title: 'Hero slot',
  slug: { _type: 'slug', current: 'hero-slot' },
  seo: { _type: 'seo', metaDescription: 'A page whose hero has a statistics bar.' },
  pageBuilder: [
    {
      _key: 'hero-slot-page-hero',
      _type: 'hero',
      variant: 'split',
      title: 'Hero with figures',
      description: 'Hero description.',
      ctas: [cta('About us', internal('page-about'))],
      supporting: [slotItem('stats', 'hero-slot-page')],
    },
  ],
})

/**
 * Animated hero parts on real pages (tests/e2e/hero-parts.spec.ts), for what the gallery cannot show:
 * a MotionProvider, so the parts really play. The first page's hero is the first section (its heading
 * and picture never start hidden); the second page starts with text, so its hero is further down.
 */
documents.push(
  {
    _id: 'page-hero-parts',
    _type: 'page',
    title: 'Hero parts',
    slug: { _type: 'slug', current: 'hero-parts' },
    seo: { _type: 'seo', noIndex: true },
    pageBuilder: [
      {
        _key: 'hero-parts-first',
        _type: 'hero',
        variant: 'overlay',
        eyebrow: 'Eyebrow',
        title: 'Hero with animated parts',
        description: 'Each part plays its own animation.',
        ctas: [cta('About us', internal('page-about'))],
        backgroundImage: image(''),
        supporting: [slotItem('badges', 'hero-parts-first')],
        partMotion: allParts,
      },
    ],
  },
  {
    _id: 'page-hero-parts-later',
    _type: 'page',
    title: 'Hero parts later',
    slug: { _type: 'slug', current: 'hero-parts-later' },
    seo: { _type: 'seo', noIndex: true },
    pageBuilder: [
      {
        _key: 'hero-parts-intro',
        _type: 'richText',
        body: [block(['Introduction'], { style: 'h2' })],
      },
      {
        _key: 'hero-parts-later',
        _type: 'hero',
        variant: 'split',
        title: 'A hero further down',
        description:
          'Its heading and picture may fade, because they are not the first on the page.',
        backgroundImage: image(''),
        partMotion: { enabled: true, headingPreset: 'reveal', imagePreset: 'scale' },
      },
    ],
  },
)

/** The testimonials slider on a real page (tests/e2e/slider.spec.ts): a MotionProvider, so it drags. */
documents.push({
  _id: 'page-slider',
  _type: 'page',
  title: 'Slider',
  slug: { _type: 'slug', current: 'slider' },
  seo: { _type: 'seo', metaDescription: 'A page with a testimonials slider.' },
  pageBuilder: [
    { _key: 'slider-hero', _type: 'hero', title: 'Slider', description: 'Hero description.' },
    {
      _key: 'slider-testimonials',
      _type: 'testimonials',
      variant: 'slider',
      title: 'Kind words',
      items: sliderQuotes('slider-page'),
    },
  ],
})

/** A Logo strip marquee on a real page (tests/e2e/logo-marquee.spec.ts), for no JavaScript: the gallery streams in with a script. */
documents.push({
  _id: 'page-logos',
  _type: 'page',
  title: 'Logos',
  slug: { _type: 'slug', current: 'logos' },
  seo: { _type: 'seo', metaDescription: 'A page with a logo marquee.' },
  pageBuilder: [
    { _key: 'logos-hero', _type: 'hero', title: 'Logos', description: 'Hero description.' },
    {
      _key: 'logos-marquee',
      _type: 'logoCloud',
      variant: 'marquee',
      title: 'Trusted by',
      logos: ['Acme', 'Globex', 'Initech'].map((name) => ({
        _key: key(),
        name,
        image: image(name),
      })),
    },
  ],
})

/** Embed sections on a real page (tests/e2e/embed.spec.ts): one per approved provider, and an exact height. */
documents.push({
  _id: 'page-embed',
  _type: 'page',
  title: 'Embed',
  slug: { _type: 'slug', current: 'embed' },
  seo: { _type: 'seo', metaDescription: 'A page with embeds.' },
  pageBuilder: [
    { _key: 'embed-hero', _type: 'hero', title: 'Embed', description: 'Hero description.' },
    embedSection('embed-typeform', {
      title: 'Book a consultation',
      text: 'Tell us about your project.',
      provider: 'typeform',
      url: EMBED_URL.typeform,
      height: 'tall',
    }),
    embedSection('embed-maps', {
      title: 'Find the studio',
      provider: 'google-maps',
      url: EMBED_URL.maps,
    }),
    embedSection('embed-spotify', {
      title: 'Our studio playlist',
      provider: 'spotify',
      url: EMBED_URL.spotify,
      customHeight: 352,
    }),
  ],
})

/** Video sections on a real page (tests/e2e/video.spec.ts): one of each source, and an ambient loop. */
documents.push({
  _id: 'page-video',
  _type: 'page',
  title: 'Video',
  slug: { _type: 'slug', current: 'video' },
  seo: { _type: 'seo', metaDescription: 'A page with videos.' },
  pageBuilder: [
    { _key: 'video-hero', _type: 'hero', title: 'Video', description: 'Hero description.' },
    videoSection('video-youtube', {
      title: 'YouTube film',
      text: 'Plays from YouTube.',
      source: 'youtube',
      url: VIDEO_URL.youtube,
    }),
    videoSection('video-vimeo', {
      title: 'Vimeo film',
      source: 'vimeo',
      url: 'https://vimeo.com/76979871/abcdef1234',
    }),
    videoSection('video-upload', {
      title: 'Uploaded film',
      source: 'upload',
      file: fileRef(VIDEO_ASSET_ID),
      captions: fileRef(CAPTIONS_ASSET_ID),
    }),
    videoSection('video-loop', {
      variant: 'ambient',
      title: 'Ambient loop',
      text: 'A quiet loop.',
      file: fileRef(VIDEO_ASSET_ID),
    }),
  ],
})

/** Galleries on a real page (tests/e2e/gallery.spec.ts): a MotionProvider, so the lightbox drags. */
documents.push({
  _id: 'page-gallery',
  _type: 'page',
  title: 'Gallery',
  slug: { _type: 'slug', current: 'gallery' },
  seo: { _type: 'seo', metaDescription: 'A page with image galleries.' },
  pageBuilder: [
    { _key: 'gallery-hero', _type: 'hero', title: 'Gallery', description: 'Hero description.' },
    {
      _key: 'gallery-page-grid',
      _type: 'gallery',
      variant: 'grid',
      title: 'Grid gallery',
      columns: 3,
      images: galleryImages('gallery-page-grid', 12),
    },
    {
      _key: 'gallery-page-slider',
      _type: 'gallery',
      variant: 'slider',
      title: 'Slider gallery',
      columns: 3,
      images: galleryImages('gallery-page-slider', 6),
    },
  ],
})

/** Location sections on a real page (tests/e2e/location.spec.ts): a MotionProvider and the footer's Business info. */
documents.push({
  _id: 'page-location',
  _type: 'page',
  title: 'Location',
  slug: { _type: 'slug', current: 'location' },
  seo: { _type: 'seo', metaDescription: 'A page with the business location.' },
  pageBuilder: [
    { _key: 'location-hero', _type: 'hero', title: 'Location', description: 'Hero description.' },
    {
      _key: 'location-cards',
      _type: 'location',
      title: 'Visit us',
      intro: 'Find us in Newtown, or call ahead.',
      showHours: true,
      showOpenNow: true,
      showContact: true,
      directionsLabel: 'Get directions',
      interactiveMap: true,
    },
    {
      _key: 'location-picture',
      _type: 'location',
      title: 'With a map image',
      mapImage: image('A map of Newtown'),
      showHours: true,
      showOpenNow: false,
      showContact: true,
      directionsLabel: 'Directions',
    },
  ],
})

/**
 * The team (tests/e2e/team.spec.ts). Order: Ann (1), Ben (2), Cara (3), then Dev, who has no
 * order and so comes last. Ann has every optional field; Ben a page but no contact details; Cara no
 * page address (her card must not link); Dev a page. The gallery's picked list also references a
 * member who does not exist, as an unpublished one resolves to nothing in the published perspective
 * (the fake lake serves every document, so a real draft cannot be shown here).
 */
const teamMember = (id, name, role, extra = {}) => ({
  _id: `teamMember-${id}`,
  _type: 'teamMember',
  name,
  role,
  portrait: image(`Portrait of ${name}`),
  shortBio: `${name} short bio.`,
  ...extra,
})
const memberSlug = (current) => ({ slug: { _type: 'slug', current } })

documents.push(
  teamMember('ann', 'Ann Lee', 'Principal solicitor', {
    ...memberSlug('ann-lee'),
    order: 1,
    shortBio: 'Ann leads the firm and has acted for local families for twenty years.',
    bio: [block(['Ann founded the practice in 2004.']), block(['She mentors our graduates.'])],
    qualifications: ['LLB (Hons)', 'GAICD'],
    publicEmail: 'ann@example.com',
    phone: '02 9876 5432',
    socialLinks: [
      {
        _key: 'ann-linkedin',
        _type: 'socialLink',
        platform: 'linkedin',
        url: 'https://www.linkedin.com/in/ann-lee-example',
      },
    ],
  }),
  teamMember('ben', 'Ben Ng', 'Senior associate', {
    ...memberSlug('ben-ng'),
    order: 2,
    bio: [block(['Ben joined from a large city firm.'])],
  }),
  teamMember('cara', 'Cara Doyle', 'Office manager', { order: 3 }),
  teamMember('dev', 'Dev Patel', 'Paralegal', memberSlug('dev-patel')),
)

/** Team sections on a real page, with a MotionProvider (tests/e2e/team.spec.ts). `team` alone is a legal page slug. */
documents.push({
  _id: 'page-team',
  _type: 'page',
  title: 'Our team',
  slug: { _type: 'slug', current: 'team' },
  seo: { _type: 'seo', metaDescription: 'The people behind Test Co.' },
  pageBuilder: [
    { _key: 'team-hero', _type: 'hero', title: 'Our team', description: 'Hero description.' },
    {
      _key: 'team-all',
      _type: 'team',
      title: 'Everyone',
      selection: 'all',
      variant: 'grid',
    },
    {
      _key: 'team-picked',
      _type: 'team',
      title: 'Just two',
      selection: 'picked',
      variant: 'list',
      members: [
        { _key: 'pick-ben', ...ref('teamMember-ben') },
        { _key: 'pick-ann', ...ref('teamMember-ann') },
      ],
    },
  ],
})

/**
 * Events (tests/e2e/events.spec.ts). Two sets:
 *  - The gallery's events are fixed, in 2099 and in the "Workshop" category, so the section gallery's
 *    screenshots never change.
 *  - The page's events are dated from the day the suite runs (the clock is the point: the list must
 *    hide the past ones). Past: an open day a month ago, a fair two months ago. Coming up, in days:
 *    a weekly club (Tuesdays, one of them skipped), a workshop (10), a sold-out dinner (12), a
 *    cancelled concert (15), an online talk (20) and an all-day open day (30).
 * Times are midnight UTC, which is 10 or 11 am in Sydney, so a Tuesday in UTC is a Tuesday there too.
 */
const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000
const today = Math.floor(Date.now() / DAY_MS) * DAY_MS
const inDays = (days, hours = 0) => new Date(today + days * DAY_MS + hours * HOUR_MS).toISOString()
const dayKey = (ms) => new Date(ms).toISOString().slice(0, 10)

/** Tuesdays at 00:00 UTC still to come when the fixture loads, from the next one on. */
const upcomingTuesdays = Array.from({ length: 14 }, (_, week) => today + (week * 7 + 1) * DAY_MS)
  .map((ms) => ms + ((2 - new Date(ms).getUTCDay() + 7) % 7) * DAY_MS)
  .filter((ms) => ms > Date.now() + 3 * HOUR_MS)
/** The series started 8 weeks before its first upcoming Tuesday, so it is already under way. */
const seriesStart = (upcomingTuesdays[0] ?? today) - 56 * DAY_MS
export const eventDates = {
  /** Tuesdays (YYYY-MM-DD) the weekly club meets, from the first still to come. */
  club: upcomingTuesdays.map(dayKey),
  /** The Tuesday the club does not meet. */
  skipped: dayKey(upcomingTuesdays[1] ?? today),
  /** The last Tuesday of the series. */
  until: dayKey(upcomingTuesdays[upcomingTuesdays.length - 1] ?? today),
}

const eventDoc = (id, title, start, extra = {}) => ({
  _id: `event-${id}`,
  _type: 'event',
  title,
  slug: { _type: 'slug', current: id },
  start,
  timeZone: 'Australia/Sydney',
  status: 'scheduled',
  ...extra,
})
const studio = {
  _type: 'object',
  kind: 'venue',
  name: 'The Studio',
  address: '12 Rose St\nNewtown NSW 2042',
}

documents.push(
  { _id: 'eventCategory-workshop', _type: 'eventCategory', title: 'Workshop' },
  { _id: 'eventCategory-class', _type: 'eventCategory', title: 'Class' },
  { _id: 'eventCategory-talk', _type: 'eventCategory', title: 'Talk' },
  { _id: 'eventCategory-empty', _type: 'eventCategory', title: 'Empty' },

  // The gallery's events.
  eventDoc('hand-building-workshop', 'Hand-building workshop', '2099-03-13T23:00:00Z', {
    end: '2099-03-14T01:00:00Z',
    category: ref('eventCategory-workshop'),
    summary: 'Coil, pinch and slab: make a bowl and a small vase to take home.',
    image: image('Hands shaping clay on a wheel'),
    location: studio,
  }),
  eventDoc('evening-glazing', 'Evening glazing session', '2099-03-14T07:30:00Z', {
    end: '2099-03-14T09:00:00Z',
    category: ref('eventCategory-workshop'),
    summary: 'Glaze the pieces from the morning workshop, with a glass of something.',
    location: studio,
  }),
  eventDoc('open-studio-day', 'Open studio day', '2099-03-20T13:00:00Z', {
    end: '2099-03-21T01:00:00Z',
    allDay: true,
    status: 'soldOut',
    category: ref('eventCategory-workshop'),
    summary: 'Meet the makers, watch a firing and browse the shelves.',
    location: studio,
  }),
  eventDoc('glaze-chemistry-talk', 'Glaze chemistry talk', '2099-04-03T23:00:00Z', {
    end: '2099-04-04T00:00:00Z',
    status: 'cancelled',
    category: ref('eventCategory-workshop'),
    summary: 'Why glazes behave the way they do, with slides and test tiles.',
    location: { _type: 'object', kind: 'online', url: 'https://meet.example.com/glaze' },
  }),

  // The events page's events.
  eventDoc('past-open-day', 'Past open day', inDays(-30), {
    end: inDays(-30, 2),
    category: ref('eventCategory-class'),
    location: studio,
  }),
  eventDoc('past-fair', 'Past winter fair', inDays(-60), {
    end: inDays(-60, 6),
    allDay: true,
    location: studio,
  }),
  eventDoc('weekly-pottery-club', 'Weekly pottery club', new Date(seriesStart).toISOString(), {
    end: new Date(seriesStart + 2 * HOUR_MS).toISOString(),
    category: ref('eventCategory-class'),
    summary: 'Drop in on a Tuesday morning: throw, trim and talk clay.',
    location: studio,
    recurrence: {
      _type: 'object',
      repeat: 'weekly',
      until: eventDates.until,
      skip: [eventDates.skipped],
    },
  }),
  eventDoc('pottery-workshop', 'Pottery workshop', inDays(10), {
    end: inDays(10, 2),
    category: ref('eventCategory-class'),
    summary: 'A relaxed morning on the wheel, no experience needed.',
    image: image('Hands shaping clay on a wheel'),
    location: studio,
    body: [block(['Bring an apron; we provide the clay and the tea.'])],
    registration: cta('Book a place', external('https://tickets.example.com/pottery')),
    capacityNote: 'Limited to 12 people',
  }),
  eventDoc('sold-out-dinner', 'Sold-out supper night', inDays(12, 8), {
    end: inDays(12, 11),
    status: 'soldOut',
    category: ref('eventCategory-class'),
    summary: 'Supper served on the pieces you made.',
    location: studio,
    registration: cta('Buy tickets', external('https://tickets.example.com/supper')),
  }),
  eventDoc('cancelled-concert', 'Cancelled courtyard concert', inDays(15, 8), {
    end: inDays(15, 10),
    status: 'cancelled',
    category: ref('eventCategory-talk'),
    summary: 'An evening of acoustic music in the courtyard.',
    location: studio,
    registration: cta('Get tickets', external('https://tickets.example.com/concert')),
  }),
  eventDoc('online-talk', 'Online talk: firing schedules', inDays(20, 8), {
    end: inDays(20, 9),
    category: ref('eventCategory-talk'),
    summary: 'How long, how hot and why, with questions at the end.',
    location: { _type: 'object', kind: 'online', url: 'https://meet.example.com/firing' },
    registration: cta('Save your seat', external('https://tickets.example.com/talk')),
  }),
  eventDoc('open-day', 'Spring open day', inDays(30), {
    end: inDays(30, 6),
    allDay: true,
    summary: 'The whole studio is open all day.',
    location: studio,
  }),
)

/** The events page: a list of everything (with the calendar feed link), classes as an agenda, talks as a feature. */
documents.push(
  {
    _id: 'page-events',
    _type: 'page',
    title: 'What’s on',
    slug: { _type: 'slug', current: 'events' },
    seo: { _type: 'seo', metaDescription: 'Workshops, classes and talks.' },
    pageBuilder: [
      { _key: 'events-hero', _type: 'hero', title: 'What’s on', description: 'Hero description.' },
      {
        _key: 'events-all',
        _type: 'events',
        title: 'Coming up',
        text: 'Everything on the calendar.',
        count: 20,
        seeAllLink: external('https://example.com/everything'),
        seeAllLabel: 'See everything',
      },
      {
        _key: 'events-classes',
        _type: 'events',
        variant: 'agenda',
        title: 'Classes',
        category: ref('eventCategory-class'),
        count: 12,
      },
      {
        _key: 'events-talks',
        _type: 'events',
        variant: 'featured',
        title: 'Talks',
        category: ref('eventCategory-talk'),
      },
    ],
  },
  {
    _id: 'page-quiet-events',
    _type: 'page',
    title: 'Quiet events',
    slug: { _type: 'slug', current: 'quiet-events' },
    seo: { _type: 'seo', metaDescription: 'An events page with nothing coming up.' },
    pageBuilder: [
      {
        _key: 'quiet-hero',
        _type: 'hero',
        title: 'Quiet events',
        description: 'Hero description.',
      },
      {
        _key: 'quiet-events',
        _type: 'events',
        title: 'Nothing yet',
        category: ref('eventCategory-empty'),
      },
    ],
  },
)

// Tall enough that the scroll-linked line is part-drawn at some scroll positions (process.spec.ts).
documents.push({
  _id: 'page-process',
  _type: 'page',
  title: 'Process',
  slug: { _type: 'slug', current: 'process' },
  seo: { _type: 'seo', metaDescription: 'A page with a process timeline.' },
  pageBuilder: [
    { _key: 'process-hero', _type: 'hero', title: 'Process', description: 'Hero description.' },
    {
      _key: 'process-filler',
      _type: 'richText',
      body: [
        block(['Filler'], { style: 'h2' }),
        block(['A paragraph of copy so the timeline starts below the fold. '.repeat(30)]),
      ],
    },
    {
      _key: 'process-timeline',
      _type: 'process',
      variant: 'alternating',
      title: 'Our process',
      steps: processSteps('process-page'),
    },
    {
      _key: 'process-tail',
      _type: 'richText',
      body: [
        block(['After the timeline'], { style: 'h2' }),
        block(['A paragraph of copy so the page scrolls past the timeline. '.repeat(40)]),
      ],
    },
  ],
})

documents.push({
  _id: 'page-stats',
  _type: 'page',
  title: 'Statistics',
  slug: { _type: 'slug', current: 'stats' },
  seo: { _type: 'seo', metaDescription: 'A page with animated statistics.' },
  pageBuilder: [
    { _key: 'stats-hero', _type: 'hero', title: 'Statistics', description: 'Hero description.' },
    {
      _key: 'stats-filler',
      _type: 'richText',
      body: [
        block(['Filler'], { style: 'h2' }),
        block(['A paragraph of copy so the figures start below the fold. '.repeat(30)]),
      ],
    },
    {
      _key: 'stats-animated',
      _type: 'stats',
      title: 'Animated figures',
      style: { _type: 'sectionStyle', motion: 'reveal' },
      items: [
        { _key: 'a-big', _type: 'statItem', value: 12500, suffix: '+', label: 'Counted up' },
        { _key: 'a-rate', _type: 'statItem', value: 4.9, decimals: 1, label: 'With a decimal' },
        {
          _key: 'a-money',
          _type: 'statItem',
          value: 1.2,
          decimals: 1,
          prefix: '$',
          suffix: 'm',
          label: 'With a symbol',
        },
      ],
    },
    {
      _key: 'stats-filler-2',
      _type: 'richText',
      body: [
        block(['More filler'], { style: 'h2' }),
        block(['A paragraph of copy so the next figures start below the fold. '.repeat(30)]),
      ],
    },
    {
      _key: 'stats-still',
      _type: 'stats',
      variant: 'cards',
      title: 'Still figures',
      style: { _type: 'sectionStyle', motion: 'none' },
      items: [
        { _key: 's-big', _type: 'statItem', value: 98000, label: 'Never animated' },
        { _key: 's-two', _type: 'statItem', value: 7, label: 'Plain text' },
      ],
    },
  ],
  _updatedAt: UPDATED,
})

/**
 * Highlighted heading words (tests/e2e/heading-text.spec.ts): the hero's `heading` wins over a stale
 * `title`, each treatment appears once, and a hero further down renders an h2.
 */
documents.push({
  _id: 'page-highlights',
  _type: 'page',
  title: 'Highlights',
  slug: { _type: 'slug', current: 'highlights' },
  seo: { _type: 'seo', metaDescription: 'Highlighted heading words.' },
  pageBuilder: [
    {
      _key: 'highlights-hero',
      _type: 'hero',
      title: 'Old plain title',
      heading: headingText('highlights-hero', [
        'Build ',
        ['something', 'gradient', 'brand'],
        ' people ',
        ['remember', 'underline'],
      ]),
      description: 'Hero description.',
    },
    {
      _key: 'highlights-later',
      _type: 'hero',
      style: { _type: 'sectionStyle', tone: 'surface' },
      heading: headingText('highlights-later', [
        'A ',
        ['second', 'highlight'],
        ' hero is an ',
        ['h2', 'brand'],
      ]),
    },
  ],
  _updatedAt: UPDATED,
})

/**
 * Custom gradient colours in a heading (tests/e2e/heading-text.spec.ts): the hero is the page's one h1
 * with a three-colour gradient at 45 degrees; a later hero uses the Brand colours gradient "Forest dusk"
 * (designSettings above) by name, and one that has since left Design settings.
 */
documents.push({
  _id: 'page-custom-gradient',
  _type: 'page',
  title: 'Custom gradient',
  slug: { _type: 'slug', current: 'custom-gradient' },
  seo: { _type: 'seo', metaDescription: 'A heading with a custom gradient.' },
  pageBuilder: [
    {
      _key: 'custom-gradient-hero',
      _type: 'hero',
      style: { _type: 'sectionStyle', tone: 'surface' },
      heading: headingText('custom-gradient-hero', [
        'Colours ',
        [
          'in your own words',
          'gradient',
          'custom',
          { stops: ['#1D4ED8', '#7c3aed', '#be185d'], angle: 45 },
        ],
      ]),
      description: 'Hero description.',
    },
    {
      _key: 'custom-gradient-named',
      _type: 'hero',
      style: { _type: 'sectionStyle', tone: 'surface' },
      heading: headingText('custom-gradient-named', [
        'A named ',
        ['brand gradient', 'gradient', 'brand-colours:forest-dusk'],
        ' and one that is ',
        ['gone', 'gradient', 'brand-colours:removed'],
      ]),
    },
    {
      // Not a hero: a section title is rich too, on the card's own tone (README, "Highlighting words in a heading").
      _key: 'custom-gradient-cta',
      _type: 'ctaBanner',
      tone: 'light',
      heading: headingText('custom-gradient-cta', [
        'Ready for ',
        ['colour', 'colour', undefined, { colour: '#7C3AED' }],
        ' and ',
        ['weight', 'plain', undefined, { bold: true, italic: true }],
        '?',
      ]),
      ctas: [cta('Get started', internal('page-about'))],
    },
    {
      // A migrated section still shows its old string title.
      _key: 'custom-gradient-features',
      _type: 'featuresGrid',
      title: 'Old string title',
      columns: 3,
      items: [1, 2, 3].map((i) => ({ _key: `cg-f${i}`, title: `Feature ${i}`, text: 'Text.' })),
    },
  ],
  _updatedAt: UPDATED,
})

/**
 * The Link page (tests/e2e/link-list.spec.ts): a minimal page (no header or footer) with a profile,
 * custom social icons, a featured link with UTM tags, groups, and links that are hidden, not yet due,
 * past their date, or in their window. Times are far from now, so the outcome never depends on the day.
 */
/**
 * The six pre-launch looks (src/features/pages/utils/prelaunch-looks.ts) applied to the Link page + coming soon
 * and Coming soon templates, as pages (tests/e2e/prelaunch-looks.spec.ts). Keep the values in step with the table
 * and the Link list presets.
 */
const PRELAUNCH_LOOK_FIXTURES = [
  {
    value: 'minimal',
    tone: 'surface',
    hero: 'overlay',
    list: { variant: 'stacked', rowStyle: 'solid', thumbnailSize: 'standard' },
    align: 'center',
  },
  {
    value: 'dark',
    tone: 'inverse',
    hero: 'overlay',
    photo: true,
    list: {
      variant: 'stacked',
      rowStyle: 'glass',
      thumbnailSize: 'standard',
      glassStrength: 'medium',
    },
    align: 'center',
  },
  {
    value: 'editorial',
    tone: 'surface',
    hero: 'editorial',
    list: { variant: 'editorial', rowStyle: 'solid', thumbnailSize: 'standard' },
    align: 'start',
  },
  {
    value: 'bold',
    tone: 'accent',
    hero: 'overlay',
    list: { variant: 'stacked', rowStyle: 'solid', thumbnailSize: 'standard' },
    align: 'center',
  },
  {
    value: 'image-led',
    tone: 'surface',
    hero: 'split',
    list: { variant: 'cards', rowStyle: 'solid', thumbnailSize: 'large' },
    align: 'center',
  },
  {
    value: 'soft',
    tone: 'alt',
    hero: 'overlay',
    list: { variant: 'cards', rowStyle: 'solid', thumbnailSize: 'standard' },
    align: 'center',
  },
]
function prelaunchLookPages() {
  return PRELAUNCH_LOOK_FIXTURES.flatMap(({ value, tone, hero, photo, list, align }) => {
    const photoStyle = photo
      ? { fillScreen: true, overlay: 'light', overlayColor: 'dark', image: image('') }
      : {}
    const style = (extra = {}) => ({
      _type: 'sectionStyle',
      tone,
      align,
      spacing: 'compact',
      ...extra,
    })
    const key = (name) => `look-${value}-${name}`
    return [
      {
        _id: `page-look-links-${value}`,
        _type: 'page',
        title: `Look: ${value} (Link page)`,
        slug: { _type: 'slug', current: `look-links-${value}` },
        minimalLayout: true,
        seo: { _type: 'seo', noIndex: true },
        pageBuilder: [
          {
            _key: key('note'),
            _type: 'richText',
            style: style(),
            body: [
              {
                _key: key('note-p'),
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _key: key('note-s'),
                    _type: 'span',
                    text: 'Our new website is on its way. Until then, everything is here.',
                    marks: [],
                  },
                ],
              },
            ],
          },
          {
            _key: key('list'),
            _type: 'linkList',
            ...list,
            style: style(photoStyle),
            profile: { _type: 'object', name: 'Test Co', bio: 'Small-batch ceramics.' },
            socialSource: 'custom',
            socialLinks: [],
            links: [
              linkItem(key('book'), 'Book now', external('https://example.com/book'), {
                featured: true,
                icon: 'clock',
                thumbnail: image('Booking'),
              }),
              linkItem(key('shop'), 'Shop the range', external('https://example.com/shop'), {
                icon: 'bolt',
                thumbnail: image('Shop'),
              }),
              linkItem(
                key('insta'),
                'Follow on Instagram',
                external('https://instagram.com/testco'),
                { icon: 'leaf', thumbnail: image('Instagram') },
              ),
            ],
          },
          {
            _key: key('signup'),
            _type: 'newsletterSignup',
            title: 'Be the first to know',
            text: 'Get one email when the new website launches.',
            submitLabel: 'Subscribe',
            successMessage: 'Thanks! Check your inbox for a message from us.',
            style: style(),
          },
        ],
      },
      {
        _id: `page-look-soon-${value}`,
        _type: 'page',
        title: `Look: ${value} (Coming soon)`,
        slug: { _type: 'slug', current: `look-soon-${value}` },
        minimalLayout: true,
        seo: { _type: 'seo', noIndex: true },
        pageBuilder: [
          {
            _key: key('hero'),
            _type: 'hero',
            variant: hero,
            title: 'Something new is on its way',
            description: 'A short line about what is coming.',
            style: {
              _type: 'sectionStyle',
              tone,
              fillScreen: true,
              ...(photo ? { overlay: 'light', overlayColor: 'dark', image: image('') } : {}),
            },
            supporting: [
              {
                _key: key('date'),
                _type: 'launchDate',
                label: 'Opening',
                date: '2099-01-05',
                countdown: false,
              },
            ],
          },
          {
            _key: key('soon-signup'),
            _type: 'newsletterSignup',
            title: 'Be the first to know',
            text: 'Get one email when we open.',
            submitLabel: 'Subscribe',
            successMessage: 'Thanks! Check your inbox for a message from us.',
            style: style(),
          },
        ],
      },
    ]
  })
}

/**
 * Hero pages with a launch date line (tests/e2e/launch-date.spec.ts): a far-off date with the live
 * countdown, the same without it, and a date that has passed (nothing shows).
 */
function launchDatePages() {
  const page = (slug, title, launchDate) => ({
    _id: `page-${slug}`,
    _type: 'page',
    title,
    slug: { _type: 'slug', current: slug },
    seo: { _type: 'seo', noIndex: true },
    pageBuilder: [
      {
        _key: `${slug}-hero`,
        _type: 'hero',
        variant: 'overlay',
        title,
        description: 'Hero description.',
        style: { _type: 'sectionStyle', tone: 'surface' },
        supporting: [
          { _key: `${slug}-date`, _type: 'launchDate', label: 'Opening', ...launchDate },
        ],
      },
    ],
  })
  return [
    page('launch-date', 'Launch date with countdown', { date: '2099-01-05', countdown: true }),
    page('launch-date-plain', 'Launch date without countdown', {
      date: '2099-01-05',
      time: '09:30',
      countdown: false,
    }),
    page('launch-date-past', 'Launch date in the past', { date: '2020-01-01', countdown: true }),
  ]
}

documents.push(
  {
    // The Presentation secret /api/draft-mode/enable validates (next-sanity reads this shared-access
    // document, which does not expire); used by tests/e2e/prelaunch-gate.spec.ts.
    _id: 'sanity-preview-url-secret.share-access',
    _type: 'sanity.previewUrlShareAccess',
    secret: 'e2e-draft-mode-secret',
    studioUrl: 'http://localhost:3102/studio',
  },
  {
    _id: 'page-links',
    _type: 'page',
    title: 'Links',
    slug: { _type: 'slug', current: 'links' },
    minimalLayout: true,
    seo: { _type: 'seo', metaDescription: 'Where to find Test Co.' },
    pageBuilder: [
      {
        _key: 'links-list',
        _type: 'linkList',
        variant: 'stacked',
        thumbnailSize: 'standard',
        profile: {
          _type: 'object',
          name: 'Test Co',
          bio: 'Small-batch ceramics from the Inner West.',
        },
        socialSource: 'custom',
        socialLinks: [
          {
            _key: 'ig',
            _type: 'socialLink',
            platform: 'instagram',
            url: 'https://instagram.com/testco',
          },
          {
            _key: 'yt',
            _type: 'socialLink',
            platform: 'youtube',
            url: 'https://youtube.com/@testco',
          },
        ],
        links: [
          linkItem('l-book', 'Book a consultation', external('https://example.com/book'), {
            description: 'Thirty minutes, free of charge',
            featured: true,
            utmSource: 'instagram',
            utmMedium: 'bio',
            utmCampaign: 'spring',
          }),
          linkItem('l-journal', 'Read the journal', internal('page-about'), { icon: 'star' }),
          linkItem('l-later', 'Opening soon', external('https://example.com/soon'), {
            showFrom: '2099-01-01T00:00:00Z',
          }),
          linkItem('l-over', 'Last summer’s sale', external('https://example.com/old'), {
            showUntil: '2020-01-01T00:00:00Z',
          }),
          linkItem('l-window', 'Spring offer', external('https://example.com/spring'), {
            showFrom: '2020-01-01T00:00:00Z',
            showUntil: '2099-01-01T00:00:00Z',
          }),
          linkItem('l-shop', 'Shop the range', external('https://example.com/shop'), {
            group: 'Shop',
          }),
          linkItem('l-hidden', 'Secret link', external('https://example.com/secret'), {
            visibility: 'hide',
            group: 'Shop',
          }),
          linkItem('l-gift', 'Gift cards', external('https://example.com/gift'), { group: 'Shop' }),
          linkItem('l-party', 'Launch party', external('https://example.com/party'), {
            group: 'Coming up',
            showFrom: '2099-01-01T00:00:00Z',
          }),
        ],
      },
      {
        // Gives the pre-launch server a newsletter form on "/" (tests/e2e/prelaunch-gate.spec.ts).
        _key: 'links-signup',
        _type: 'newsletterSignup',
        title: 'Be the first to know',
        text: 'One email when the new website opens.',
        submitLabel: 'Subscribe',
        successMessage: 'Thanks! Check your inbox to confirm.',
      },
      {
        _key: 'links-note',
        _type: 'richText',
        body: [block(['© Test Co. Made in Newtown.'])],
      },
    ],
  },
  ...[
    // Link pages with a background that fills the screen (README, "Section backgrounds"): a full-screen
    // photo with a dark wash, and a faint transparent pattern sitting at the bottom, not cropped.
    [
      'links-photo',
      'Links with a photo',
      {
        tone: 'inverse',
        image: image(''),
        overlay: 'medium',
        overlayColor: 'dark',
        fillScreen: true,
      },
    ],
    [
      'links-pattern',
      'Links with a pattern',
      {
        tone: 'surface',
        image: pattern(),
        imageSize: 'actual',
        imageVertical: 'bottom',
        imageHorizontal: 'center',
        imageStrength: 'faint',
        overlay: 'none',
        fillScreen: true,
      },
    ],
    [
      'links-tiled',
      'Links with a tiled pattern',
      {
        tone: 'surface',
        image: pattern(),
        imageSize: 'actual',
        imageRepeat: 'both',
        imageStrengthPercent: 20,
        overlay: 'none',
        imageFixed: true,
        fillScreen: true,
      },
    ],
  ].map(([slug, title, style]) => ({
    _id: `page-${slug}`,
    _type: 'page',
    title,
    slug: { _type: 'slug', current: slug },
    minimalLayout: true,
    seo: { _type: 'seo', noIndex: true },
    pageBuilder: [
      {
        _key: `${slug}-list`,
        _type: 'linkList',
        variant: 'stacked',
        thumbnailSize: 'standard',
        style: { _type: 'sectionStyle', ...style },
        profile: { _type: 'object', name: 'Test Co', bio: 'Small-batch ceramics.' },
        socialSource: 'custom',
        socialLinks: [],
        links: [
          linkItem(`${slug}-book`, 'Book a consultation', external('https://example.com/book')),
          linkItem(`${slug}-shop`, 'Shop the range', external('https://example.com/shop')),
        ],
      },
    ],
  })),
  {
    // Glass rows over a background photo, on a minimal page (tests/e2e/link-list-glass.spec.ts).
    _id: 'page-link-glass',
    _type: 'page',
    title: 'Glass links',
    slug: { _type: 'slug', current: 'link-glass' },
    minimalLayout: true,
    seo: { _type: 'seo', noIndex: true },
    pageBuilder: [
      {
        _key: 'glass-list',
        _type: 'linkList',
        variant: 'stacked',
        rowStyle: 'glass',
        glassStrength: 'medium',
        showArrows: true,
        thumbnailSize: 'standard',
        style: {
          _type: 'sectionStyle',
          align: 'center',
          spacing: 'spacious',
          image: image(''),
          overlay: 'none',
        },
        profile: {
          _type: 'object',
          name: 'Sunrise Community Care',
          bio: 'Support, connection and a warm welcome.',
        },
        socialSource: 'none',
        links: [
          linkItem('g-care', 'Our care services', external('https://example.com/care'), {
            description: 'Home help, respite and support at every stage of life',
            icon: 'care',
            thumbnail: image('Care'),
          }),
          linkItem('g-community', 'Join the community', external('https://example.com/join'), {
            description: 'Groups, walks and shared lunches',
            icon: 'community',
            thumbnail: image('Community'),
          }),
          linkItem('g-book', 'Book a visit', internal('page-about'), {
            icon: 'calendar',
            thumbnail: image('Calendar'),
          }),
          // No picture and no icon: the row still holds together.
          linkItem('g-plain', 'Call us on 1300 000 000', external('https://example.com/call'), {
            description: 'Weekdays, 8 am to 5 pm',
          }),
          linkItem('g-icon', 'Find us', external('https://example.com/find'), {
            icon: 'location',
          }),
        ],
      },
    ],
  },
  {
    // Every Link list design option at once (tests/e2e/link-list-design.spec.ts): a wordmark for the
    // name, a ring, coloured name and bio, External link arrows on Cards, round social icons below.
    _id: 'page-link-design',
    _type: 'page',
    title: 'Link design',
    slug: { _type: 'slug', current: 'link-design' },
    minimalLayout: true,
    seo: { _type: 'seo', noIndex: true },
    pageBuilder: [
      {
        _key: 'design-list',
        _type: 'linkList',
        variant: 'cards',
        thumbnailSize: 'standard',
        heading: [
          {
            _type: 'block',
            _key: 'h',
            style: 'normal',
            markDefs: [],
            children: [{ _type: 'span', _key: 's', text: 'Find us online', marks: [] }],
          },
        ],
        headingDisplay: 'image',
        headingImage: { _type: 'image', asset: ref(IMAGE_ASSET_ID), size: 'small' },
        style: { _type: 'sectionStyle', align: 'center' },
        profile: {
          _type: 'object',
          name: 'Test Co',
          bio: 'Small-batch ceramics.',
          image: image('Test Co logo'),
          nameDisplay: 'text',
        },
        profileDesign: {
          _type: 'object',
          imageSize: 'large',
          border: 'line',
          borderWidth: 'thick',
          borderGap: 'large',
          borderColour: { _type: 'object', colour: 'accent-2' },
          nameColour: { _type: 'object', colour: 'custom', hex: '#7a1f5c' },
          bioColour: { _type: 'object', colour: 'ink' },
        },
        linkDesign: {
          _type: 'object',
          arrowStyle: 'external',
          arrowColour: { _type: 'object', colour: 'accent' },
          iconColour: { _type: 'object', colour: 'custom', hex: 'not-a-colour' },
        },
        socialDesign: { _type: 'object', style: 'circle', position: 'below' },
        socialSource: 'custom',
        socialLinks: [
          {
            _key: 'ig',
            _type: 'socialLink',
            platform: 'instagram',
            url: 'https://instagram.com/testco',
          },
          {
            _key: 'yt',
            _type: 'socialLink',
            platform: 'youtube',
            url: 'https://youtube.com/@testco',
          },
          {
            _key: 'tt',
            _type: 'socialLink',
            platform: 'tiktok',
            url: 'https://tiktok.com/@testco',
          },
        ],
        links: [
          linkItem('d-shop', 'Shop the range', external('https://example.com/shop'), {
            icon: 'bolt',
          }),
          linkItem('d-about', 'About the studio', internal('page-about'), { icon: 'star' }),
        ],
      },
    ],
  },
  {
    // The blur preview is only for opaque pictures (tests/e2e/image-placeholder.spec.ts): a transparent
    // logo as the profile picture and as a wordmark, and an opaque photo as a picture.
    _id: 'page-image-placeholders',
    _type: 'page',
    title: 'Image placeholders',
    slug: { _type: 'slug', current: 'image-placeholders' },
    minimalLayout: true,
    seo: { _type: 'seo', noIndex: true },
    pageBuilder: [
      {
        _key: 'ph-logo',
        _type: 'linkList',
        variant: 'stacked',
        thumbnailSize: 'standard',
        style: { _type: 'sectionStyle', align: 'center' },
        profile: {
          _type: 'object',
          name: 'Transparent logo',
          image: { _type: 'image', alt: 'Logo', asset: ref(LOGO_ASSET_ID) },
          nameDisplay: 'image',
          nameImage: { _type: 'image', asset: ref(LOGO_ASSET_ID), size: 'medium' },
        },
        socialSource: 'none',
        links: [linkItem('ph-l', 'Link', external('https://example.com/l'))],
      },
      {
        _key: 'ph-photo',
        _type: 'linkList',
        variant: 'stacked',
        thumbnailSize: 'standard',
        style: { _type: 'sectionStyle', align: 'center' },
        profile: {
          _type: 'object',
          name: 'Opaque photo',
          image: { _type: 'image', alt: 'Photo', asset: ref(PHOTO_ASSET_ID) },
        },
        socialSource: 'none',
        links: [linkItem('ph-p', 'Link', external('https://example.com/p'))],
      },
    ],
  },
  {
    // Depth and glow (tests/e2e/link-list-depth.spec.ts): Cards with floating links, raised social
    // buttons and a raised picture with a Highlight glow on a dark tone; Glass rows with only a glow
    // (the glass keeps its own shadow); and a Minimal list with nothing chosen (unchanged).
    _id: 'page-link-depth',
    _type: 'page',
    title: 'Link depth',
    slug: { _type: 'slug', current: 'link-depth' },
    minimalLayout: true,
    seo: { _type: 'seo', noIndex: true },
    pageBuilder: [
      {
        _key: 'depth-cards',
        _type: 'linkList',
        variant: 'cards',
        thumbnailSize: 'standard',
        style: { _type: 'sectionStyle', align: 'center', tone: 'inverse' },
        profile: { _type: 'object', name: 'Floating cards', image: image('Logo') },
        socialDesign: { _type: 'object', style: 'circle' },
        socialSource: 'custom',
        socialLinks: [
          {
            _key: 'ig',
            _type: 'socialLink',
            platform: 'instagram',
            url: 'https://instagram.com/x',
          },
        ],
        depthDesign: {
          _type: 'object',
          linkShadow: 'floating',
          socialShadow: 'raised',
          pictureShadow: 'raised',
          glow: 'soft',
          glowTargets: ['links', 'picture'],
          glowColour: { _type: 'object', colour: 'highlight' },
        },
        links: [
          linkItem('depth-a', 'Floating link', external('https://example.com/a'), { icon: 'sun' }),
        ],
      },
      {
        _key: 'depth-glass',
        _type: 'linkList',
        variant: 'stacked',
        rowStyle: 'glass',
        glassStrength: 'strong',
        thumbnailSize: 'standard',
        style: { _type: 'sectionStyle', align: 'center', image: image(''), overlay: 'none' },
        profile: { _type: 'object', name: 'Glowing glass' },
        socialSource: 'none',
        depthDesign: { _type: 'object', glow: 'strong' },
        links: [linkItem('depth-g', 'Glass link', external('https://example.com/g'))],
      },
      {
        _key: 'depth-plain',
        _type: 'linkList',
        variant: 'stacked',
        thumbnailSize: 'standard',
        style: { _type: 'sectionStyle', align: 'center' },
        profile: { _type: 'object', name: 'Nothing chosen' },
        socialSource: 'none',
        links: [linkItem('depth-p', 'Plain link', external('https://example.com/p'))],
      },
    ],
  },
  {
    // Service categories and paragraph-aware bios (tests/e2e/link-list-categories.spec.ts): a Glass
    // rows list over a photo whose bio still repeats the categories (the page shows them once), a
    // list saved before categories existed (its typed bullets stay text), and a start-aligned list
    // of long capitalised names that stacks on phones.
    _id: 'page-link-categories',
    _type: 'page',
    title: 'Link categories',
    slug: { _type: 'slug', current: 'link-categories' },
    minimalLayout: true,
    seo: { _type: 'seo', noIndex: true },
    pageBuilder: [
      {
        _key: 'cat-glass',
        _type: 'linkList',
        variant: 'stacked',
        rowStyle: 'glass',
        glassStrength: 'strong',
        thumbnailSize: 'standard',
        style: { _type: 'sectionStyle', align: 'center', image: image(''), overlay: 'none' },
        profile: {
          _type: 'object',
          name: 'Still Water Wellness',
          image: image('Still Water Wellness logo'),
          categories: ['Bodywork', 'Breathwork', 'Movement', 'Retreats'],
          bio: 'Bodywork • Breathwork • Movement • Retreats\n\nReconnect to your body and your nature.\nRemember what makes you feel alive!',
        },
        categoryDesign: {
          _type: 'object',
          separatorColour: { _type: 'object', colour: 'custom', hex: '#8a6d1d' },
        },
        socialSource: 'none',
        links: [
          linkItem('cat-book', 'Book a session', external('https://example.com/book'), {
            icon: 'calendar',
          }),
        ],
      },
      {
        _key: 'cat-legacy',
        _type: 'linkList',
        variant: 'stacked',
        thumbnailSize: 'standard',
        style: { _type: 'sectionStyle', align: 'center', tone: 'alt' },
        profile: {
          _type: 'object',
          name: 'Saved before categories',
          bio: 'Bodywork • Breathwork • Movement • Retreats\n\nReconnect to your body and your nature. Remember what makes you feel alive!',
        },
        socialSource: 'none',
        links: [linkItem('cat-legacy-link', 'Visit', external('https://example.com/visit'))],
      },
      {
        _key: 'cat-long',
        _type: 'linkList',
        variant: 'editorial',
        thumbnailSize: 'standard',
        style: { _type: 'sectionStyle', align: 'start', tone: 'inverse' },
        profile: {
          _type: 'object',
          name: 'Long names',
          categories: [
            'Remedial massage',
            'Pregnancy and postnatal care',
            'Myofascial release',
            'Craniosacral therapy for the whole family',
          ],
          bio: 'One paragraph only.',
        },
        categoryDesign: {
          _type: 'object',
          separator: 'diamond',
          phoneLayout: 'stack',
          textCase: 'uppercase',
          textColour: { _type: 'object', colour: 'accent' },
          separatorColour: { _type: 'object', colour: 'highlight' },
        },
        socialSource: 'none',
        links: [linkItem('cat-long-link', 'Enquire', external('https://example.com/enquire'))],
      },
      {
        _key: 'cat-hidden',
        _type: 'linkList',
        variant: 'compact',
        thumbnailSize: 'standard',
        style: { _type: 'sectionStyle', align: 'center' },
        profile: {
          _type: 'object',
          name: 'Hidden categories',
          categories: ['Never shown'],
          categoriesVisibility: 'hide',
        },
        socialSource: 'none',
        links: [linkItem('cat-hidden-link', 'Shop', external('https://example.com/shop'))],
      },
      {
        _key: 'cat-features',
        _type: 'featuresGrid',
        title: 'Paragraphs everywhere',
        intro: 'The first paragraph.\nWith a line break.\n\n\n\nThe second paragraph.',
        columns: 2,
        items: [1, 2].map((i) => ({
          _key: `cat-feature-${i}`,
          _type: 'featureItem',
          title: `Feature ${i}`,
          text: 'Text.',
        })),
      },
    ],
  },
  {
    // A long Glass rows list over a Cover the screen photo, with the name as a wordmark and a
    // decorative frame (tests/e2e/link-list-design.spec.ts): the photo stays the window's size.
    _id: 'page-link-screen',
    _type: 'page',
    title: 'Link screen',
    slug: { _type: 'slug', current: 'link-screen' },
    minimalLayout: true,
    seo: { _type: 'seo', noIndex: true },
    pageBuilder: [
      {
        _key: 'screen-list',
        _type: 'linkList',
        variant: 'stacked',
        rowStyle: 'glass',
        glassStrength: 'strong',
        thumbnailSize: 'standard',
        style: {
          _type: 'sectionStyle',
          align: 'center',
          image: image(''),
          imageSize: 'screen',
          overlay: 'none',
        },
        profile: {
          _type: 'object',
          name: 'Sunrise Community Care',
          image: image('Sunrise logo'),
          nameDisplay: 'image',
          nameImage: { _type: 'image', asset: ref(IMAGE_ASSET_ID), size: 'medium' },
        },
        profileDesign: { _type: 'object', border: 'frame', frame: ref('frame-leaf') },
        socialDesign: { _type: 'object', style: 'rounded' },
        socialSource: 'custom',
        socialLinks: [
          {
            _key: 'ig',
            _type: 'socialLink',
            platform: 'instagram',
            url: 'https://instagram.com/sunrise',
          },
        ],
        links: Array.from({ length: 14 }, (_, index) =>
          linkItem(
            `s-${index}`,
            `Link number ${index + 1}`,
            external(`https://example.com/${index}`),
            {
              icon: 'leaf',
            },
          ),
        ),
      },
    ],
  },
  {
    // The "Coming soon" page template (src/features/pages/schemas/templates.ts), as an editor would
    // leave it (tests/e2e/prelaunch-pages.spec.ts). Keep it in step with the template.
    _id: 'page-coming-soon',
    _type: 'page',
    title: 'Coming soon',
    slug: { _type: 'slug', current: 'coming-soon' },
    minimalLayout: true,
    seo: { _type: 'seo', noIndex: true },
    pageBuilder: [
      {
        _key: 'cs-hero',
        _type: 'hero',
        variant: 'overlay',
        title: 'Something new is on its way',
        description: 'Replace: Opening [date]',
        style: { _type: 'sectionStyle', tone: 'surface', fillScreen: true },
      },
      {
        _key: 'cs-signup',
        _type: 'newsletterSignup',
        title: 'Be the first to know',
        text: 'Get one email when we open.',
        submitLabel: 'Subscribe',
        successMessage: 'Thanks! Check your inbox for a message from us.',
        style: { _type: 'sectionStyle', align: 'center', spacing: 'compact' },
      },
      {
        _key: 'cs-socials',
        _type: 'linkList',
        variant: 'compact',
        thumbnailSize: 'standard',
        style: { _type: 'sectionStyle', align: 'center', spacing: 'compact' },
        socialSource: 'business',
        links: [],
      },
    ],
  },
  {
    // The "Under construction" page template, with a form chosen as publishing requires.
    _id: 'page-under-construction',
    _type: 'page',
    title: 'Under construction',
    slug: { _type: 'slug', current: 'under-construction' },
    minimalLayout: true,
    seo: { _type: 'seo', noIndex: true },
    pageBuilder: [
      {
        _key: 'uc-hero',
        _type: 'hero',
        variant: 'overlay',
        title: 'We’re updating our website',
        description:
          'Replace: A line or two on what is changing and when it will be back. In the meantime, get in touch below.',
        style: { _type: 'sectionStyle', tone: 'surface' },
      },
      {
        _key: 'uc-location',
        _type: 'location',
        title: 'Contact us',
        showHours: true,
        showOpenNow: true,
        showContact: true,
        directionsLabel: 'Get directions',
      },
      {
        _key: 'uc-form',
        _type: 'formSection',
        title: 'Send us a message',
        text: 'We’ll reply as soon as we can.',
        form: ref('form-contact'),
      },
    ],
  },
  ...prelaunchLookPages(),
  ...launchDatePages(),
  {
    // A Link list inside an ordinary page (it keeps the header and footer), in two layouts.
    _id: 'page-link-list',
    _type: 'page',
    title: 'Link list',
    slug: { _type: 'slug', current: 'link-list' },
    seo: { _type: 'seo', metaDescription: 'A page with link lists.' },
    pageBuilder: [
      {
        _key: 'link-list-hero',
        _type: 'hero',
        title: 'Link list',
        description: 'Hero description.',
      },
      {
        _key: 'link-list-page-cards',
        _type: 'linkList',
        variant: 'cards',
        title: 'Where to next',
        socialSource: 'none',
        links: galleryLinks('pc'),
      },
      {
        _key: 'link-list-page-compact',
        _type: 'linkList',
        variant: 'compact',
        title: 'Quick links',
        socialSource: 'none',
        links: galleryLinks('pq'),
      },
    ],
  },
)

documents.push({
  _id: 'page-section-gallery',
  _type: 'page',
  title: 'Section gallery',
  slug: { _type: 'slug', current: 'section-gallery' },
  // The route is not reachable as a normal page; this keeps the document out of the sitemap and search.
  seo: { _type: 'seo', noIndex: true },
  pageBuilder: gallerySections,
  _updatedAt: UPDATED,
})

/**
 * Section dividers on a real page, with the site's footer under it (tests/e2e/section-edges.spec.ts):
 * an edge above a flat section, an edge above a picture, an edge above a members-only section, an
 * edge on a shared section and an edge on the last section, which the footer takes.
 */
const edgeSection = (id, title, style) => ({
  _key: id,
  _type: 'richText',
  style: { _type: 'sectionStyle', anchorId: id, ...style },
  body: [block([title], { style: 'h2' }), block(['A paragraph of copy under the heading.'])],
})
documents.push(
  {
    _id: 'shared-edge',
    _type: 'sharedSection',
    title: 'Shared section with an edge',
    section: [
      {
        ...edgeSection('shared-edge-section', 'Shared, with a diagonal', {
          tone: 'accent',
          edge: 'diagonal',
        }),
      },
    ],
    _updatedAt: UPDATED,
  },
  {
    _id: 'page-edges',
    _type: 'page',
    title: 'Section dividers',
    slug: { _type: 'slug', current: 'edges' },
    seo: { _type: 'seo', noIndex: true },
    pageBuilder: [
      edgeSection('edge-first', 'First, with a wave', { tone: 'inverse', edge: 'wave' }),
      edgeSection('edge-second', 'Second, with a layered wave', {
        tone: 'alt',
        edge: 'layered',
        edgeAccent: 'accent',
        edgeHeight: 'large',
      }),
      edgeSection('edge-third', 'Third, over a picture', {
        tone: 'surface',
        image: image(''),
        overlay: 'strong',
        edge: 'arch',
      }),
      {
        ...edgeSection('edge-members', 'Secret members section', {
          tone: 'inverse',
          edge: 'curve',
        }),
        access: 'members',
      },
      { _key: 'edge-shared', ...ref('shared-edge') },
      edgeSection('edge-after-shared', 'After the shared section', { tone: 'surface' }),
      edgeSection('edge-last', 'Last, with a curve', {
        tone: 'inverse',
        edge: 'curve',
        edgeHeight: 'medium',
      }),
    ],
    _updatedAt: UPDATED,
  },
)
