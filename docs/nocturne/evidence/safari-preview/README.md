# Real Safari check: composed edge and a legacy edge (Task 3)

**Status: not observed yet.** Nothing below is a result until the Observed column is filled in by someone looking at
real Safari. Playwright's WebKit (see [webkit-hairlines-control](../webkit-hairlines-control/README.md)) does not stand in for it.

**Preview:** the e2e fixture site (fake Content Lake, production build) serves `/edge-composed-authored` with two edges
on one page: an authored composition (`#ca-upper`: layered contours, gradient line, partial-width tint, centre icon,
shadow) and a representative legacy saved edge (`#ca-legacy-surface`: a stored wave on a Surface section, which must stay
see-through). Start it from this branch with `node scripts/e2e-server.mjs` (port 3100), then open
`http://<this Mac's address>:3100/edge-composed-authored` in Safari on the Mac and on the iPhone.

| Device and OS | Safari version | Window or viewport | Zoom / pixel ratio | Observed |
| --- | --- | --- | --- | --- |
| _not yet recorded_ | | | | |

Look for, at each size (phone width, tablet, desktop) and at 90%, 100%, 110% and 125% zoom on the Mac:
1. `#ca-upper`: the cut follows its contour with no 1 px light or dark line along it; the tint is clipped to the artwork's
   width and opens around the centre icon; the shadow falls below the cut only; the gradient line sits on the cut.
2. `#ca-legacy-surface`: the wave looks as it did before Task 1 (section stays see-through; no new line along the wave).
3. Scrolling and resizing leave no flicker, gap or overlap at the edges; text stays readable over the tint.
