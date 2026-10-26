# Applying version 21 to the Currawong Build Plan

**Approved:** by the owner on 26 October 2026. That covers S-D1 to S-D8 and the six refinements in [NOCTURNE_SETTINGS_CONFIGURATION.md](../NOCTURNE_SETTINGS_CONFIGURATION.md) §R (r2).

**What it does:**

- revises task 227: a new title, what, why and files, and its prompt is replaced (the v20 prompt is kept in `../e-canonical-patch/prompts.txt`);
- adds tasks 230–235 to stage `f`, directly after 227, with their prompts;
- adds dependencies: 200 gets 233, and 209 gets 230 and 231;
- appends additions to the prompts of 30, 31, 39, 129, 200, 208 and 209, and adds a note to each of their cards;
- updates the `f` milestone (MS0) and the `fx` milestone (MS, with its acceptance criterion);
- updates the lede, the "newest" note, the footer, the Approved direction panel, and both context blocks.

**What it leaves alone:**

- every other task, status, note and prompt;
- the stages' ids and order;
- the progress database, the icon and the capabilities.

**Tested** against live version `1792971826-11fd` on 26 October 2026:

- `build.py` applies cleanly;
- the data arrays round-trip unchanged before editing;
- validation passes: 235 tasks, 16 stages, every dependency present, no cycles, one prompt per task;
- a diff shows only the intended tasks, prompts and lines changed;
- `node --check` passes;
- a headless Chromium render shows 235 tasks in 16 stages, every prompt filled in, and no page errors.

## Steps (in a fresh Claude Code session)

1. **Read the live page.** Use `Artifact` with `action: "read"` and `url: https://claude.ai/artifact/7kWst2fHcf2eZocg9h3xwL`, then Read the saved file in full.
2. **Check the version.** If it's no longer `1792971826-11fd`, review what changed first. The build refuses to run twice: it asserts that tasks 230+ and MS0 don't exist yet.
3. **Build:**

   ```sh
   python3 -I docs/nocturne/s1-canonical-patch/build.py <saved.html> <out.html>
   node --check <out.html>.data.js
   ```

4. **Publish.** Use `Artifact` to publish `<out.html>` with `url: https://claude.ai/artifact/7kWst2fHcf2eZocg9h3xwL`. Don't change the icon or capabilities, and don't pass `force`.
5. **Progress:** no database changes. New tasks start as `todo`.
