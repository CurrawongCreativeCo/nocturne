import { Button, Card, Heading, Stack, Text } from '@sanity/ui'

import type { PublishProblem } from '../utils/publish-validation'

/** Dialog body; Sanity's document action host supplies the accessible modal and focus trap. */
export function PublishValidationDialog({
  problems,
  isValidating,
  onGoToField,
}: {
  problems: readonly PublishProblem[]
  isValidating: boolean
  onGoToField: (problem: PublishProblem) => void
}) {
  const errors = problems.filter((problem) => problem.level === 'error')
  const warnings = problems.filter((problem) => problem.level === 'warning')
  return (
    <Stack gap={4}>
      <Text>
        {errors.length
          ? 'Fix these errors before publishing.'
          : 'There are no errors blocking publishing.'}
      </Text>
      {isValidating ? <Text role="status">Checking your latest changes…</Text> : null}
      {(
        [
          ['Errors', errors],
          ['Warnings', warnings],
        ] as const
      ).map(([title, items]) =>
        items.length ? (
          <Stack gap={3} key={title}>
            <Heading as="h2" size={1}>
              {title}
            </Heading>
            {title === 'Warnings' ? (
              <Text size={1}>These are suggestions. You can still publish.</Text>
            ) : null}
            <Stack as="ul" gap={3}>
              {items.map((problem) => (
                <Card
                  as="li"
                  key={JSON.stringify([problem.path, problem.level, problem.message])}
                  padding={3}
                  radius={2}
                  border
                  tone={title === 'Errors' ? 'critical' : 'caution'}
                >
                  <Stack gap={3}>
                    <Text weight="semibold" size={1}>
                      {problem.title}
                    </Text>
                    <Text size={1}>{problem.message}</Text>
                    {problem.hidden ? <Text size={1}>{problem.hidden}</Text> : null}
                    <Button
                      text="Go to field"
                      aria-label={`Go to field: ${problem.title}`}
                      mode="ghost"
                      onClick={() => {
                        onGoToField(problem)
                      }}
                    />
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Stack>
        ) : null,
      )}
    </Stack>
  )
}
