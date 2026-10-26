/**
 * Who has changed a draft, and whether each of them may still have their changes published without
 * the agency. Pure; `api/sanity-reads.ts` reads the History and Access APIs. The History API says
 * who wrote each transaction, the Access API says what role each member holds today, so a person
 * suspended or removed after editing is refused. Knowing a draft's revision is not identity.
 */

/**
 * Roles whose changes the gate publishes: Contributors, Editors and the agency's own roles. Viewers,
 * custom roles and anyone with no role are refused (deny by default).
 */
export const PUBLISHABLE_ROLES: ReadonlySet<string> = new Set([
  'contributor',
  'editor',
  'administrator',
  'developer',
])

export interface Transaction {
  id: string
  author: string
  timestamp: string
}

/** Parses the History API's newline-delimited transaction log, skipping blank and malformed lines. */
export function parseTransactions(ndjson: string): Transaction[] {
  const out: Transaction[] = []
  for (const line of ndjson.split('\n')) {
    if (line.trim() === '') continue
    try {
      const entry = JSON.parse(line) as Partial<Transaction>
      if (entry.id && entry.author && entry.timestamp) {
        out.push({ id: entry.id, author: entry.author, timestamp: entry.timestamp })
      }
    } catch {
      // A line that is not JSON is not a transaction; the caller refuses if nothing usable remains.
    }
  }
  return out
}

/**
 * The distinct authors of every transaction after `publishedAt` (the published version's last
 * update), or of all of them when nothing is published. A transaction with an unreadable timestamp
 * counts: when in doubt it is included.
 */
export function authorsSince(
  transactions: readonly Transaction[],
  publishedAt: string | undefined,
): string[] {
  const since = Date.parse(publishedAt ?? '')
  const recent = transactions.filter((transaction) => !(Date.parse(transaction.timestamp) <= since))
  return [...new Set(recent.map((transaction) => transaction.author))]
}

export interface Member {
  /** The Access API's `memberships[].resourceUserId`: the id the History API reports as author. */
  resourceUserId: string
  roleNames: readonly string[]
}

export type AuthorRefusal = 'not-a-member' | 'role-not-allowed'

export type AuthorCheck =
  | { ok: true; authors: string[] }
  | {
      ok: false
      reason: 'no-authors' | AuthorRefusal
      refused: { author: string; why: AuthorRefusal }[]
    }

/** Whether a role list contains one the gate publishes for. */
export function hasPublishableRole(roleNames: readonly string[] | undefined): boolean {
  return Boolean(roleNames?.some((name) => PUBLISHABLE_ROLES.has(name)))
}

/**
 * Every author needs to be a current member with a publishable role. A robot token, a removed
 * member and an unknown id are not members; a Viewer or a custom role is not publishable. No authors
 * at all means the history could not attribute the draft, which is refused too.
 */
export function checkAuthors(authors: readonly string[], members: readonly Member[]): AuthorCheck {
  if (authors.length === 0) return { ok: false, reason: 'no-authors', refused: [] }
  const roles = new Map(members.map((member) => [member.resourceUserId, member.roleNames]))
  const refused: { author: string; why: AuthorRefusal }[] = []
  for (const author of authors) {
    const names = roles.get(author)
    if (!names) refused.push({ author, why: 'not-a-member' })
    else if (!hasPublishableRole(names)) refused.push({ author, why: 'role-not-allowed' })
  }
  const [first] = refused
  if (first) return { ok: false, reason: first.why, refused }
  return { ok: true, authors: [...authors] }
}
