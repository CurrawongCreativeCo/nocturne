import { defineBehavior, effect, raise } from '@portabletext/editor/behaviors'
import { getSelectedBlocks } from '@portabletext/editor/selectors'

import { isDividerBlock, type MoveRecord } from '../utils/rich-text-divider'

/**
 * The editor behaviours that keep a client from creating a divider in a Rich text body (task 151), by any
 * route: the toolbar's insert, paste and drop. They also stop a divider being cut away, because a cut
 * followed by a paste (blocked) would lose it. Moving by drag and deleting stay, and so does undo, which
 * restores a block without an insert event. Agency staff get none of these (the plugin mounts them for
 * everyone else). `onBlocked` says why, so a refused attempt is never silent.
 *
 * Verified in the real Studio on 11 November 2026: a real drop is `drag.drop`, `deserialize`, then
 * `insert.blocks` with the dragged block's own key, after the original was already removed, and the default
 * handler then raises a single `insert.block` per block. Both insert events must therefore allow a move.
 */
export function dividerGuardBehaviors({
  moves,
  onBlocked,
}: {
  moves: MoveRecord
  onBlocked: () => void
}) {
  const refuse = () => effect(onBlocked)
  return [
    defineBehavior({
      on: 'insert.block',
      guard: ({ event }) => moves.isNew(event.block),
      actions: [() => [refuse()]],
    }),
    defineBehavior({
      on: 'insert.blocks',
      guard: ({ event }) => event.blocks.some((block) => moves.isNew(block)),
      actions: [
        ({ event }) => {
          const blocks = event.blocks.filter((block) => !moves.isNew(block))
          return blocks.length > 0 ? [refuse(), raise({ ...event, blocks })] : [refuse()]
        },
      ],
    }),
    defineBehavior({
      on: 'clipboard.cut',
      guard: ({ snapshot }) => getSelectedBlocks(snapshot).some(({ node }) => isDividerBlock(node)),
      actions: [() => [refuse()]],
    }),
    // A guard that never matches, so the event carries on to the editor's own handling: it only notes
    // the dividers as they are when a drag begins, and forgets them when it ends.
    defineBehavior({
      on: 'drag.dragstart',
      guard: ({ snapshot }) => {
        moves.begin(snapshot.context.value)
        return false
      },
      actions: [],
    }),
    // A paste is never a move: if a drag's own end was somehow missed, its allowance still dies here.
    defineBehavior({
      on: 'clipboard.paste',
      guard: () => {
        moves.end()
        return false
      },
      actions: [],
    }),
    defineBehavior({
      on: 'drag.dragend',
      guard: () => {
        moves.end()
        return false
      },
      actions: [],
    }),
  ]
}
