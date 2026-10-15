/**
 * Australian Business Number helpers. An ABN is 11 digits; the checksum subtracts 1 from the first
 * digit, multiplies each digit by a weight and needs the total to divide by 89 (ATO's published rule).
 */

const WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]

/** Digits only, so "12 345 678 901", "12-345-678-901" and "12345678901" are the same ABN. */
export function abnDigits(value: string): string {
  return value.replace(/[\s-]/g, '')
}

export function isValidAbn(value: string): boolean {
  const digits = abnDigits(value)
  if (!/^\d{11}$/.test(digits)) return false
  const total = Array.from(digits).reduce((sum, digit, index) => {
    const n = Number(digit) - (index === 0 ? 1 : 0)
    return sum + n * (WEIGHTS[index] ?? 0)
  }, 0)
  return total % 89 === 0
}

/** Groups up to 11 digits as 2-3-3-3 while typing: "12345" -> "12 345". */
export function groupAbnDigits(digits: string): string {
  return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 8), digits.slice(8, 11)]
    .filter(Boolean)
    .join(' ')
}

/** "12345678901" -> "12 345 678 901". Anything that isn't 11 digits is returned as typed. */
export function formatAbn(value: string): string {
  const digits = abnDigits(value)
  return /^\d{11}$/.test(digits) ? groupAbnDigits(digits) : value
}
