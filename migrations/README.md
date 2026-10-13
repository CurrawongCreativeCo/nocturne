# Content migrations

Migrations change documents that already exist in a dataset. Schema changes alone never touch
stored content, so some of them need a migration; others don't.

## When a schema change needs one

| Change                                                 | Migration?                                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Add an optional field, a new document or section type  | No. Old documents simply lack the field                                        |
| Add a `required` field                                 | Yes, to give old documents a value (or they fail validation when next edited)  |
| **Rename** a field, or a document or section `_type`   | **Yes.** The old data stays under the old name and the Studio stops showing it |
| Change a field's type (`string` to `array`, and so on) | Yes                                                                            |
| Move data between fields or documents                  | Yes                                                                            |
| Remove a field                                         | Optional. The data is hidden, not deleted. Migrate to clean it up              |

If in doubt, ask whether anything stored in the dataset would stop matching the new schema.

## Writing one

```bash
npx sanity migration create "Rename page summary"   # scaffolds migrations/<id>/index.ts
```

Each migration is a folder, `migrations/<id>/index.ts`, with a default export from `defineMigration`.
[`example-rename-page-summary`](example-rename-page-summary/index.ts) renames a field and has a unit test
next to it (`npm test` picks up `migrations/**/*.test.ts`). It matches nothing in a fresh dataset; copy it
and delete it when you write your first real one.

- Make it **idempotent**: skip documents already migrated, so a second run changes nothing.
- Return `[]`/nothing for documents you don't change. Select with `documentTypes` to keep requests down.
- Ship the migration in the **same pull request** as the schema change. For a rename, make the code read
  both names until the migration has run, so the deploy and the migration can happen in either order.

## Dry run

A dry run reads the dataset and prints every patch it would make. It writes nothing. It is the default.

```bash
npx sanity login                                  # once, or set SANITY_AUTH_TOKEN
npx sanity migration run <id>                     # dry run against NEXT_PUBLIC_SANITY_DATASET
npx sanity migration run <id> --dataset staging   # or against another dataset
```

CI does this for you: pull requests that touch a schema, `sanity.config.ts` or `migrations/` dry-run every
migration against the production dataset and show the output in the job log (see the README's
_Sanity workflow_). Read it before merging.

## Running for real

**CI never runs a real migration.** Run it by hand, from a machine where you are logged in as a user
allowed to write to the dataset:

```bash
npx sanity dataset export production backup.tar.gz     # take a backup first
npx sanity migration run <id> --no-dry-run
```

It asks for confirmation before it writes. Try it on a copy first when the change is risky:
`npx sanity dataset copy production staging`, then add `--dataset staging`.

When it has run everywhere (production and any copies), delete the migration folder in a later pull
request; the git history keeps it. A migration left in place is dry-run on every schema pull request.
