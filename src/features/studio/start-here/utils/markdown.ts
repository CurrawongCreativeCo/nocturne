/**
 * A deliberately tiny markdown reader for the editor guide: headings, paragraphs, bullet and
 * numbered lists, https links and **bold**. Anything else stays plain text. It returns data, not
 * HTML, so the Studio renders it as React elements and nothing is ever injected as markup.
 */

export type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'link'; text: string; href: string }

export type Block =
  | { kind: 'heading'; level: number; inlines: Inline[] }
  | { kind: 'paragraph'; inlines: Inline[] }
  | { kind: 'list'; ordered: boolean; items: Inline[][] }

const INLINE = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g
const HEADING = /^(#{1,6})\s+(.*)$/
const BULLET = /^[-*]\s+(.*)$/
const NUMBERED = /^\d+[.)]\s+(.*)$/

/** Only https links become links; anything else (javascript:, http:, relative) shows as text. */
const isSafeHref = (href: string) => href.startsWith('https://')

export function parseInline(source: string): Inline[] {
  const inlines: Inline[] = []
  let last = 0
  for (const match of source.matchAll(INLINE)) {
    if (match.index > last) inlines.push({ kind: 'text', text: source.slice(last, match.index) })
    const [whole, bold, label, href] = match
    if (bold !== undefined) {
      inlines.push({ kind: 'bold', text: bold })
    } else if (label !== undefined && href !== undefined && isSafeHref(href)) {
      inlines.push({ kind: 'link', text: label, href })
    } else {
      inlines.push({ kind: 'text', text: label ?? whole })
    }
    last = match.index + whole.length
  }
  if (last < source.length) inlines.push({ kind: 'text', text: source.slice(last) })
  return inlines
}

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = []
  let paragraph: string[] = []

  const endParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: 'paragraph', inlines: parseInline(paragraph.join(' ')) })
      paragraph = []
    }
  }

  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim()
    if (line === '') {
      endParagraph()
      continue
    }

    const heading = HEADING.exec(line)
    if (heading?.[1] !== undefined && heading[2] !== undefined) {
      endParagraph()
      blocks.push({
        kind: 'heading',
        level: heading[1].length,
        inlines: parseInline(heading[2]),
      })
      continue
    }

    const bullet = BULLET.exec(line)
    const numbered = NUMBERED.exec(line)
    const itemText = (bullet ?? numbered)?.[1]
    if (itemText !== undefined) {
      endParagraph()
      const ordered = numbered !== null
      const previous = blocks[blocks.length - 1]
      if (previous?.kind === 'list' && previous.ordered === ordered) {
        previous.items.push(parseInline(itemText))
      } else {
        blocks.push({ kind: 'list', ordered, items: [parseInline(itemText)] })
      }
      continue
    }

    // An indented line under a list item continues that item.
    const previous = blocks[blocks.length - 1]
    if (paragraph.length === 0 && previous?.kind === 'list' && /^\s/.test(raw)) {
      const lastItem = previous.items[previous.items.length - 1]
      if (lastItem) lastItem.push({ kind: 'text', text: ' ' }, ...parseInline(line))
      continue
    }
    paragraph.push(line)
  }
  endParagraph()
  return blocks
}
