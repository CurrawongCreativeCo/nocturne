/**
 * Who counts as a member. `AUTH_ALLOWED_EMAILS` lists addresses and whole domains, separated by
 * commas or spaces: "ann@example.com, @example.org". Empty means anyone who can sign in is a member,
 * which suits a provider that already limits who may sign in (a private identity provider).
 */
export function parseAllowList(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(/[\s,]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

export function isAllowedMember(email: string | null | undefined, allowList: string[]): boolean {
  if (allowList.length === 0) return true
  const address = email?.trim().toLowerCase()
  if (!address) return false
  return allowList.some((entry) =>
    entry.startsWith('@') ? address.endsWith(entry) : address === entry,
  )
}
