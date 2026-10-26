# Applying version 20 to the Currawong Build Plan

**Approved:** by the owner on 26 October 2026: R2-1 to R2-6, E-A3, E-A9, and E-A10 subject to validation. The decisions are in [NOCTURNE_DE_CI_ROADMAP_INTEGRATION.md](../NOCTURNE_DE_CI_ROADMAP_INTEGRATION.md) §1 and §9.

**What it does:**

- adds stages `de` and `ci` after stage `f`;
- adds tasks 215–229 and their prompts (227 in stage `f`);
- re-stages 193, 213 and 194 to `de`, and 188, 191, 192, 212 and 195 to `ci`;
- changes the dependencies of 193, 194, 192, 195, 202, 210, 208 and 209;
- appends additions to 21 prompts;
- updates the `f` and `fx` milestones, the lede, the "newest" note, the footer, the approved direction panel and the template context block.

**What it leaves alone:** every task ID, status, note and earlier prompt text, and the progress database.

**Already tested** against live version `1792925278-5621` on 26 October 2026:

- `build.py` applies cleanly, and the data arrays round-trip unchanged before editing;
- the build's own validation passes: 229 tasks, 16 stages, every dependency present, no cycles, one prompt per task;
- `node --check` passes;
- a headless Chromium render shows 229 tasks in 16 stages, with no page errors.

## Steps (in a fresh Claude Code session)

1. **Read the live page.** Use `Artifact` with `action: "read"` and `url: https://claude.ai/artifact/7kWst2fHcf2eZocg9h3xwL`, then Read the saved file in full. The tool requires every line to be read before republishing. It's about 9,200 lines and roughly 400k tokens, so read it in chunks of about 500 lines.
2. **Check the version.** If it's no longer `1792925278-5621`, review what changed first. The build refuses to run twice (it asserts that `de`, `ci` and tasks 215+ don't exist yet).
3. **Build:**

   ```sh
   python3 -I docs/nocturne/e-canonical-patch/build.py <saved.html> <out.html>
   node --check <out.html>.data.js
   ```

4. **Publish.** Use `Artifact` to publish `<out.html>` with `url: https://claude.ai/artifact/7kWst2fHcf2eZocg9h3xwL`. Don't change the icon or capabilities, and don't pass `force`.
5. **Progress:** no database changes. New tasks start as `todo`, and 188 stays `doing` until PR #102 merges.
