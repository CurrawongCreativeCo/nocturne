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
  // new-section:gallery
]

/** The gallery sections' ids, in page order: one visual test and one baseline per id. */
export const galleryIds = gallerySections.map((section) => section._key)

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
