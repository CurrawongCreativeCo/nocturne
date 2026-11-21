# WebKit hairlines control (composable section edges, Task 3)

`tests/e2e/section-edge-hairlines.spec.ts` in Playwright WebKit 27.2 (build v2370) on GitHub's `ubuntu-latest`
(image ubuntu-26.04 20261116.202.1, Ubuntu 26.04.1 LTS, Node v24.22.3), two workers. This is Playwright's WebKit,
not Safari on a Mac or an iPhone.

| Run                                                                                            | Commit                         | Hairlines result                                                         |
| ---------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------ |
| Task 3 pass, run 44820147515 (`feat/composed-edge-task-3`, whole WebKit pass)                  | dedea515 + the WebKit workflow | 27 failed cases in the hairlines spec                                    |
| Control, runs 44825231488 and 44827024079 (`ci/webkit-hairlines-control`, hairlines spec only) | e6730c2 (before Task 1)        | 27 failed cases, 53 measurement-only passes; both control runs identical |

**Result:** the 27 failing shape/ratio cases are the same set, with the same widths and pixel counts (81 width
cases), in the Task 3 run and in the control run on the pre-Task-1 renderer and fixtures. No case is new or worse.
These are recorded as **pre-existing in this WebKit setup**. Each is one device-pixel row (y 0 in the band) of the
page background showing in the cut at a pixel ratio of 1.25 or 1.5; ratios 1, 2 and 3 pass.
The composed edge is not involved: none of these shapes use it.

Files: `control-e6730c2-hairlines-report.json` (Playwright JSON, with every case's measurement annotation) and three
screenshots from the control run (`curve-medium` at 1.25x 390 px and 1.5x 411 px, which show the faint line at the
section seam, and `wave-medium` at 1.25x 390 px). The HTML reports are workflow artifacts that expire
(Task 3 run: 7 days; control runs: 14 days).

The Task 3 run's cases were compared from its log (every failure prints its Received signatures); its JSON was not kept.

## The 27 failing cases (control run; the Task 3 run printed the same signature for each)

| Shape and size     | Ratio | Widths: pixels in the one-row hairline                                                                                                         |
| ------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| arch-medium        | 1.25x | 360 px: 450 px, row 0                                                                                                                          |
| contour-medium     | 1.25x | 768 px: 960 px, row 0                                                                                                                          |
| curve-medium       | 1.25x | 390 px: 488 px, row 0; 411 px: 514 px, row 0                                                                                                   |
| diagonal-medium    | 1.25x | 360 px: 450 px, row 0; 411 px: 514 px, row 0                                                                                                   |
| lagoon-large       | 1.25x | 411 px: 514 px, row 0                                                                                                                          |
| layered-medium     | 1.25x | 390 px: 488 px, row 0; 1280 px: 1600 px, row 0                                                                                                 |
| reef-large         | 1.25x | 411 px: 514 px, row 0                                                                                                                          |
| reef-medium        | 1.25x | 1000 px: 1250 px, row 0; 1440 px: 1800 px, row 0                                                                                               |
| still-water-large  | 1.25x | 768 px: 960 px, row 0; 1000 px: 1250 px, row 0; 1440 px: 1800 px, row 0                                                                        |
| still-water-medium | 1.25x | 390 px: 488 px, row 0; 768 px: 960 px, row 0                                                                                                   |
| tide-large         | 1.25x | 360 px: 450 px, row 0; 411 px: 514 px, row 0; 1000 px: 1250 px, row 0; 1440 px: 1800 px, row 0                                                 |
| wave-small         | 1.25x | 390 px: 488 px, row 0; 411 px: 514 px, row 0; 1000 px: 1250 px, row 0; 1280 px: 1600 px, row 0; 1440 px: 1800 px, row 0                        |
| arch-medium        | 1.5x  | 390 px: 585 px, row 0; 411 px: 617 px, row 0; 1280 px: 1920 px, row 0                                                                          |
| contour-medium     | 1.5x  | 360 px: 540 px, row 0; 390 px: 585 px, row 0; 411 px: 617 px, row 0; 1000 px: 1500 px, row 0; 1280 px: 1920 px, row 0; 1440 px: 2160 px, row 0 |
| curve-large        | 1.5x  | 390 px: 585 px, row 0; 411 px: 617 px, row 0; 1000 px: 1500 px, row 0; 1280 px: 1920 px, row 0; 1440 px: 2160 px, row 0                        |
| curve-medium       | 1.5x  | 360 px: 540 px, row 0; 411 px: 617 px, row 0; 1000 px: 1500 px, row 0; 1440 px: 2160 px, row 0                                                 |
| diagonal-medium    | 1.5x  | 390 px: 585 px, row 0; 1280 px: 1920 px, row 0                                                                                                 |
| lagoon-large       | 1.5x  | 360 px: 540 px, row 0; 390 px: 585 px, row 0; 768 px: 1152 px, row 0                                                                           |
| lagoon-medium      | 1.5x  | 390 px: 585 px, row 0; 411 px: 617 px, row 0; 768 px: 1152 px, row 0; 1000 px: 1500 px, row 0; 1440 px: 2160 px, row 0                         |
| layered-medium     | 1.5x  | 360 px: 540 px, row 0; 1000 px: 1500 px, row 0; 1440 px: 2160 px, row 0                                                                        |
| reef-large         | 1.5x  | 360 px: 540 px, row 0; 390 px: 585 px, row 0; 768 px: 1152 px, row 0; 1000 px: 1500 px, row 0; 1440 px: 2160 px, row 0                         |
| reef-medium        | 1.5x  | 360 px: 540 px, row 0; 390 px: 585 px, row 0; 768 px: 1152 px, row 0                                                                           |
| still-water-medium | 1.5x  | 360 px: 540 px, row 0; 411 px: 617 px, row 0; 1000 px: 1500 px, row 0; 1440 px: 2160 px, row 0                                                 |
| tide-large         | 1.5x  | 390 px: 585 px, row 0; 768 px: 1152 px, row 0                                                                                                  |
| tide-medium        | 1.5x  | 390 px: 585 px, row 0; 768 px: 1152 px, row 0; 1000 px: 1500 px, row 0; 1280 px: 1920 px, row 0; 1440 px: 2160 px, row 0                       |
| wave-medium        | 1.5x  | 360 px: 540 px, row 0; 411 px: 617 px, row 0                                                                                                   |
| wave-small         | 1.5x  | 360 px: 540 px, row 0; 390 px: 585 px, row 0; 411 px: 617 px, row 0                                                                            |
