/**
 * A `tel:` target for a phone number as an editor types it ("02 9876 5432", "+61 412 345 678"),
 * or null when it doesn't look like a number. Keeps a leading "+" and the digits, so it dials
 * wherever the number is from; it doesn't check area codes.
 */
export function telHref(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!/^\+?[\d\s().-]+$/.test(trimmed)) return null
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length < 6 || digits.length > 15) return null
  return `${trimmed.startsWith('+') ? '+' : ''}${digits}`
}
