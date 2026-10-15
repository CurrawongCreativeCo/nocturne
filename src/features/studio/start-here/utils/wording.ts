/** The first word of a display name, or null when there is no usable name (empty, or an email address). */
export function firstName(name: string | null | undefined): string | null {
  const first = name?.trim().split(/\s+/)[0]
  return first && !first.includes('@') ? first : null
}

export function greeting(name: string | null | undefined): string {
  const first = firstName(name)
  return first ? `Hello, ${first}` : 'Hello'
}

export function welcomeLine(siteName: string): string {
  return `Here is what is happening on the ${siteName} website.`
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

/** A document's title for lists, falling back to its type ("Untitled page") when it has none. */
export function displayTitle(title: string | null | undefined, typeTitle: string): string {
  const trimmed = title?.trim()
  return trimmed ? trimmed : `Untitled ${typeTitle.toLowerCase()}`
}
