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
const cta = (label, link, variant = 'primary') => ({
  _key: key(),
  _type: 'cta',
  label,
  variant,
  link,
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
 * A `headingText` value: a single block whose parts are plain strings or [text, treatment, gradient]
 * (a highlighted phrase). Keys are derived from the heading's own, so documents stay stable.
 */
const headingText = (id, parts) => {
  const markDefs = []
  const children = parts.map((part, index) => {
    if (typeof part === 'string')
      return { _key: `${id}-s${index}`, _type: 'span', text: part, marks: [] }
    const [text, treatment, gradient] = part
    markDefs.push({
      _key: `${id}-m${index}`,
      _type: 'emphasis',
      treatment,
      ...(gradient && { gradient }),
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
 * Field changes the fake Content Lake can apply to the published Identity & search document while it runs
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
const SLOT_TYPES = ['stats', 'badges', 'logos']
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
