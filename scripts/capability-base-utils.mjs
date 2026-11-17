/**
 * What to do when the commit a change is compared with has no capability-baseline.json (task 275
 * correction; README, "Design capability contract"). The template always has one on its base commit, so
 * a missing file there is a failure: a baseline that could vanish would make "it only shrinks"
 * meaningless. An older client repository, made before the baseline existed, has none to compare with
 * on the one pull request that brings it in, so it may say so explicitly with `--allow-missing-base`. The
 * template refuses the flag.
 *
 * @param {{ missing: string, allowed: boolean, template: boolean }} input
 * @returns {{ problem?: { message: string, fix: string }, notice?: string }}
 */
export function missingBaseOutcome({ missing, allowed, template }) {
  if (!allowed) {
    return {
      problem: {
        message: `There is no baseline to compare with: ${missing}.`,
        fix: 'The template always has one on its base commit. If this is an older client repository that predates the baseline, pass --allow-missing-base on the one pull request that brings it in, and remove the flag after.',
      },
    }
  }
  if (template) {
    return {
      problem: {
        message:
          '--allow-missing-base is for older client repositories only, and this is the template.',
        fix: 'Remove the flag: the template must always have a baseline to compare with.',
      },
    }
  }
  return {
    notice: `Bootstrap: ${missing}, so the baseline isn't compared (--allow-missing-base, older client repository). Remove the flag once this pull request has merged.`,
  }
}
