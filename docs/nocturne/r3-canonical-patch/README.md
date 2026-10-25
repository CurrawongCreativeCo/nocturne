# Applying revision 3 to the Currawong Build Plan (version 19)

**Approved:** by the owner on 25 October 2026 (R3-A1 to R3-A5; R3-A6 is asked again at Phase 3).

**What it does:** adds tasks 187–214, stages `f` and `fx`, and their prompts. It also appends notes to tasks 11, 31, 32, 64, 77, 128 and 180, and updates the direction panel, the contexts and the footer.

**What it leaves alone:** every existing task, status and note.

**Already tested** against live version `1792820552-7bbf`: the build applies cleanly, `node --check` passes, and a headless render shows 214 tasks and 14 stages with no page errors.

## Steps (in a fresh Claude Code session)

1. **Read the live page.** Use `Artifact` with `action: "read"` and `url: https://claude.ai/artifact/7kWst2fHcf2eZocg9h3xwL`. Then Read the saved file in full: about 8 Read calls of 500–850 lines. The page must be fully read before it is republished.
2. **Check the version.** If it is no longer `1792820552-7bbf`, review what changed first.
3. **Build:**

   ```sh
   python3 -I docs/nocturne/r3-canonical-patch/build.py <saved.html> <out.html>
   node --check <out.html>.data.js
   ```

4. **Publish.** Use `Artifact` to publish `<out.html>` with `url: https://claude.ai/artifact/7kWst2fHcf2eZocg9h3xwL`. Don't change the icon or capabilities.
5. **Mark progress** in the plan's database: task 167 stays `doing` until it merges.
