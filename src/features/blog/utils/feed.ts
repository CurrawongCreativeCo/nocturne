export interface FeedItem {
  title: string
  /** Absolute URL of the post. Also the item's permanent id. */
  url: string
  description: string
  publishedAt: Date
  author?: string
  categories: string[]
}

interface Feed {
  title: string
  description: string
  language: string
  /** Absolute URL of the site's home page. */
  siteUrl: string
  /** Absolute URL of the feed itself. */
  feedUrl: string
  items: FeedItem[]
}

/**
 * Text -> XML text. Escapes the five reserved characters and drops control characters, which
 * XML 1.0 forbids even as entities: one pasted into a post would otherwise make the whole feed
 * unreadable to feed readers.
 */
export function escapeXml(text: string) {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

const tag = (name: string, value: string, attributes = '') =>
  `<${name}${attributes}>${escapeXml(value)}</${name}>`

/**
 * RSS 2.0 document. Dates are RFC 822 (`toUTCString`). `lastBuildDate` is the newest post's date
 * rather than the clock, so the feed is identical until content changes and caches cleanly.
 */
export function buildFeed({ title, description, language, siteUrl, feedUrl, items }: Feed) {
  const newest = items.reduce<Date | undefined>(
    (latest, { publishedAt }) => (!latest || publishedAt > latest ? publishedAt : latest),
    undefined,
  )

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    '<channel>',
    tag('title', title),
    tag('link', siteUrl),
    tag('description', description),
    tag('language', language),
    ...(newest ? [tag('lastBuildDate', newest.toUTCString())] : []),
    `<atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/>`,
    ...items.flatMap((item) => [
      '<item>',
      tag('title', item.title),
      tag('link', item.url),
      tag('guid', item.url, ' isPermaLink="true"'),
      tag('pubDate', item.publishedAt.toUTCString()),
      tag('description', item.description),
      ...(item.author ? [tag('dc:creator', item.author)] : []),
      ...item.categories.map((category) => tag('category', category)),
      '</item>',
    ]),
    '</channel>',
    '</rss>',
  ]
  return `${lines.join('\n')}\n`
}
