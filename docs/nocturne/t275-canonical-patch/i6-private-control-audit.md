# I6 private controls: audit inventory and the owner's decisions (7 November 2026)

This is documentation, not the enforceable register. `src/lib/design/capability-exceptions.ts` holds only what an
enforced rule would otherwise reject. The one row it gained is A1.

## How the scan decides

A field needs a shared builder or a reviewed exception when it sits in a **design context**, judged by where it is and
never by its name or type:

1. the Design group, and any object inside it at any depth;
2. an object whose options set `designSummary` (a link's or plan's own Appearance), at any depth;
3. a context named in `capability-design-contexts.ts` (empty today; task 156 adds `blogPostCards` `settings`).

An ordinary choice, switch or number outside those is not flagged for being one, and free text outside a design context
isn't detected (D2a). Review covers them. On the real schemas the scan finds exactly one field: A1.

## A. Recorded in the exception register

| Component | Field                       | Decision                                                                                                                                                                                                 |
| --------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| linkList  | `links[].design.appearance` | Design, temporary, removal task 156. It decides inheritance versus customisation, not layout. Task 156 replaces the private implementation with a shared mechanism and keeps saved values and behaviour. |

## B. Inventory outside any design context (not in the register)

The inventory lists every choice, switch and number with no builder, found by walking each schema. Nothing here is
flagged, so nothing here is an exception. It records what each one is and who owns the debt.

### Design debt, with an owner

| Component | Field(s)                                                                                                                                  | Owner | Note                                                                                    |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------- |
| ctaBanner | `tone`                                                                                                                                    | 159   | Approved                                                                                |
| linkList  | `rowStyle`, `glassStrength`                                                                                                               | 159   | Approved                                                                                |
| linkList  | `showArrows`                                                                                                                              | 137   | Approved                                                                                |
| linkList  | `headingDisplay`, `headingImage.size`, `profile.nameDisplay`, `profile.nameImage.size`, `links[].groupDisplay`, `links[].groupImage.size` | 156   | Approved provisionally: only if the shared implementation covers their actual behaviour |

### Specialised controls with no removal task

| Component | Field           | Class                                                                                                                                                    |
| --------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| logoRow   | `greyscale`     | A permanent, specialised design control: logo colour treatment is component-specific. No removal task is invented.                                       |
| linkList  | `thumbnailSize` | A specialised layout control. Thumbnail dimensions aren't necessarily picture framing, so it is not assigned to 177 until a shared owner is established. |

### Layout controls (seven, legitimate)

hero `imagePosition`, mediaText `imagePosition`, featuresGrid `columns`, video `aspectRatio`, slotVideo `aspectRatio`,
embed `height`, linkList `links[].featured`. A choice is not a design exception merely for being a choice.

### Content and query fields (19)

Not design controls, and kept out of the design register. Choosing the featured plan (`pricingTable`
`plans[].highlighted`) is an editorial decision; how the featured plan looks belongs to shared card design.

hero `showGreeting`; location `showHours`, `showOpenNow`, `showContact`, `showSocial`; linkList
`profile.categoriesVisibility`, `links[].visibility`, `socialSource`, `socialLinks[].platform`; pricingTable
`plans[].highlighted`; stats and statsBar `items[].value` and `items[].decimals`; video `source`; slotVideo `source`;
embed `provider`; launchDate `countdown`; and the query field team `selection`.

## C. Not inventoried as controls

- `variant` on ten sections: the field the contract reads layouts from (exempt).
- `access` on every section: who can see it, from the shared access field.
- The `link` and `cta` types: shared types. `ctas[].variant` (Button style) is visual but belongs to Buttons (CtaLink), which
  FUTURE_COVERAGE already lists for tasks 148 and 137.
