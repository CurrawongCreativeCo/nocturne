# Real Safari check: composed edge and a legacy edge (Task 3)

**Status: owner visual approval recorded (21 November 2026).** The owner checked the preview in Mac Safari and in iPhone Safari and
reported that it looked good on both. This is a visual approval only: the Safari versions, viewport sizes and zoom
levels were **not recorded**, and the individual checks listed below were not reported one by one. Playwright's WebKit (see [webkit-hairlines-control](../webkit-hairlines-control/README.md)) does not stand in for it.

**Preview:** the e2e fixture site (fake Content Lake, production build) serves `/edge-composed-authored` with two edges
on one page: an authored composition (`#ca-upper`: layered contours, gradient line, partial-width tint, centre icon,
shadow) and a representative legacy saved edge (`#ca-legacy-surface`: a stored wave on a Surface section, which must stay
see-through). Start it from this branch with `node scripts/e2e-server.mjs` (port 3100), then open
`http://<this Mac's address>:3100/edge-composed-authored` in Safari on the Mac and on the iPhone.

| Device and OS                       | Safari version | Window or viewport | Zoom / pixel ratio | Observed            |
| ----------------------------------- | -------------- | ------------------ | ------------------ | ------------------- |
| Mac (macOS version not recorded)    | not recorded   | not recorded       | not recorded       | Looked good (owner) |
| iPhone (model and iOS not recorded) | not recorded   | not recorded       | not recorded       | Looked good (owner) |

Screenshots: none from Safari are kept here. Screenshots the owner supplied earlier were taken in Chrome, not Safari,
and are not Safari evidence; none are in this repository. The images in `../webkit-hairlines-control/` are Playwright WebKit.

What the check looked for, at each size (phone width, tablet, desktop) and at 90%, 100%, 110% and 125% zoom on the Mac:

1. `#ca-upper`: the cut follows its contour with no 1 px light or dark line along it; the tint is clipped to the artwork's
   width and opens around the centre icon; the shadow falls below the cut only; the gradient line sits on the cut.
2. `#ca-legacy-surface`: the wave looks as it did before Task 1 (section stays see-through; no new line along the wave).
3. Scrolling and resizing leave no flicker, gap or overlap at the edges; text stays readable over the tint.
