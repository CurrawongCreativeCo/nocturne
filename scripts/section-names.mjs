/**
 * Names for a new section, from whatever the user typed: "Pricing table", "pricingTable" and
 * "pricing-table" all give the same result. Returns null for input that can't make a name.
 */
export function toSectionNames(input) {
  const words = String(input)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
  if (!words.length || !/^[a-z]/.test(words[0] ?? '')) return null

  return {
    kebab: words.join('-'),
    typeName: words[0] + words.slice(1).map(capitalize).join(''),
    Component: words.map(capitalize).join(''),
    title: capitalize(words.join(' ')),
  }
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1)
}
