# Presentation and scratch publish (composable section edges, Task 3)

Observed on 21 November 2026 against the disposable QA project `r4kwvgkz` / `production` ("Nocturne Studio performance"),
with the QA Viewer token as `SANITY_API_READ_TOKEN`, a local `next dev` site (port 3200) built from this branch's code, and
the real Studio (Chromium, signed in). **This is a local site against a real dataset: no deployed site was tested.**

**Page:** one scratch page, `qa-t3-authored-edge`, created as a draft through the Sanity CLI from the e2e fixture
`page-edge-composed-authored` (an authored composition on `An authored edge`, an authored rule, and a legacy saved wave).
The edge was **not** built in the Studio editor for this check; the Studio editor walkthrough is recorded separately in
[composable-section-edges.md](../../composable-section-edges.md).

| Step                               | Observed                                                                                                                                                                                                                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Presentation, draft                | The preview frame (`?sanity-preview-perspective=drafts`) drew the authored edge: one `composed` frame and one `wave` frame (the legacy section), with 7 composed edge parts (artwork, shadow and centre elements). The right pane showed the page's draft (`Draft created`). [Screenshot](./presentation-draft.png) |
| Publish through Studio             | Publish asked for confirmation ("Publish changes to http://localhost:3200/qa-t3-authored-edge?"); confirmed. Studio reported "Published just now". The published document existed and the draft was gone.                                                                                                           |
| Published page, outside draft mode | A plain request (no draft cookie) returned 200 with the same frames (`composed` 1, `wave` 1) and composed markup.                                                                                                                                                                                                   |
| Presentation after publish         | The preview drew the same edge; the pane said "Last published". [Screenshot](./presentation-after-publish.png)                                                                                                                                                                                                      |

The two screenshots look the same by eye; the composed and legacy frame counts matched between draft and published.

**Cleaned up:** the page was deleted afterwards (a query for the slug returns nothing); the dev server was stopped.
The token was created by the owner and stays in the owner's hands.

**Not observed:** a deployed site, a published page on a real domain, Presentation on a client project, or an edge built
through the Studio editor and then previewed.
