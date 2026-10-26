import { Card, Stack, Text } from '@sanity/ui'
import { useUser } from 'sanity'

import { describeChange, changeKey, type ProtectedChange } from '../utils/protected-changes'

/** A Sanity user's name, or a neutral fallback while it loads or when the user has left the project. */
function AuthorName({ id }: { id: string }) {
  const [user] = useUser(id)
  return <>{user?.displayName ?? 'Someone on the project'}</>
}

/**
 * The agency publish review: fields outside the client-editable allowlist that this publish would
 * release. `authors` is null while the history loads, or when it could not be read.
 */
export function ProtectedChangesList({
  changes,
  authors,
  loading,
}: {
  changes: readonly ProtectedChange[]
  authors: ReadonlyMap<string, string> | null
  loading: boolean
}) {
  return (
    <Card padding={3} radius={2} tone="caution" border>
      <Stack gap={3}>
        <Text size={1} weight="semibold">
          This draft changes design or technical fields that clients can’t edit
        </Text>
        <Text size={1}>
          Publishing releases {changes.length === 1 ? 'this change' : 'these changes'} to the live
          site. Check {changes.length === 1 ? 'it was' : 'they were'} meant.
        </Text>
        <Stack as="ul" gap={2} style={{ margin: 0, paddingLeft: '1.25em' }}>
          {changes.map((change) => {
            const author = authors?.get(changeKey(change))
            return (
              <Text as="li" size={1} key={changeKey(change)}>
                {describeChange(change)}
                {author ? (
                  <>
                    {' '}
                    — changed by <AuthorName id={author} />
                  </>
                ) : null}
              </Text>
            )
          })}
        </Stack>
        {loading ? (
          <Text size={1} muted>
            Looking up who made these changes…
          </Text>
        ) : !authors ? (
          <Text size={1} muted>
            Who made these changes couldn’t be loaded, so only the fields are listed.
          </Text>
        ) : null}
      </Stack>
    </Card>
  )
}
