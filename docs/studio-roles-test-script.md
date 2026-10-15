# Studio roles: manual test script

Run this on a **throwaway** Sanity project (never a client's), with a dataset you can wreck. Roles are
checked by Sanity's servers and the Studio, so the fake Content Lake used by the automated tests can't
stand in for them. Setup creates a project: do it by hand in sanity.io/manage, not from a script.

## Setup

1. In sanity.io/manage create a project on a Growth plan (or trial) with a dataset called `production`.
   Add `http://localhost:3000` to its CORS origins with credentials.
2. Invite three test accounts, each its own email address:
   - **Admin**: Administrator
   - **Editor**: Editor
   - **Contributor**: Contributor
3. Point `.env.local` at the throwaway project (`NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`),
   run `npm run dev`, and sign in to http://localhost:3000/studio with each account in its own browser
   profile. As Admin, create a home page, an "about" page, a post, a redirect and a form first.

Tick each line as "pass" or note what you saw.

## 1. Admin (Administrator): the full view

- [ ] A strip above the navbar shows the **Agency view** badge and a **Preview client view** button.
- [ ] Tools: Start here, Presentation, Structure, Vision, AI settings and Content health are all there.
- [ ] Sidebar: Site settings, Pages, Shared sections, Forms, Blog, Redirects, A/B tests (and any other types).
- [ ] A page shows the **Who can see this page** field and, in SEO, **Hide from search engines**.
- [ ] Site settings has the Search & AI and Cookie banner groups.
- [ ] A page's slug stays editable after it has a value.
- [ ] A page's **Add item** menu lists every section, including Shared section.
- [ ] A page has Publish, Duplicate and Delete in its action menu.
- [ ] **New document** lists every type, including the blank Page.

## 2. Preview as a client (still signed in as Admin)

- [ ] Click **Preview client view**. The page reloads and the strip says **Previewing client view**.
- [ ] Every "Editor" check in section 3 now passes (except the Sanity-enforced ones in section 5, which
      follow Admin's real permissions).
- [ ] Click **Back to agency view**: section 1 passes again.
- [ ] Clear site data for localhost:3000: the Studio opens in the agency view (the choice is per browser).

## 3. Editor: the simple, safe view

- [ ] No badge or strip above the navbar.
- [ ] Tools: Start here first (the Studio opens on it), then Presentation, then Structure. No Vision, AI settings or Content health.
- [ ] Sidebar: Site settings, Pages and Blog only. No Forms, Redirects, A/B tests or Shared sections. Type
      `/studio/structure/redirect` in the address bar: the list is empty or missing rather than offered.
- [ ] Site settings shows General, Announcement, Header and Footer only.
- [ ] A page has no **Who can see this page** field and no **Hide from search engines**; the Design group
      (when the site has one) is gone.
- [ ] Open a page whose slug is set: the slug is read-only. On a brand-new page the slug is editable until it
      has a value.
- [ ] A page's **Add item** menu lists only Rich text, Image + text, FAQ, Call to action banner and
      Testimonials (or the site profile's `clientSections` when the site has one). Open a page that already
      holds a Hero: it still shows and edits.
- [ ] Page and post action menus have no Delete or Duplicate. Site settings has no Delete or Duplicate.
- [ ] **New document** offers Landing page, Content page and Post (plus Author and Category), and not the
      blank Page, Form, Redirect or A/B test.
- [ ] Publish works on a page.

## 4. Contributor: drafts only

- [ ] Same view as the Editor in section 3.
- [ ] Edit a page: there is no Publish button, only the draft is saved.
- [ ] Admin can see the contributor's draft and publish it.

## 5. What only Sanity enforces

- [ ] As Contributor, open the browser console on the Studio and run a publish through the API
      (`fetch` a mutation to `https://<projectId>.api.sanity.io/v2025-01-01/data/mutate/production` with
      `createOrReplace` and an id without the `drafts.` prefix, using the session cookie). Sanity refuses it.
- [ ] As Editor, Project settings (Members, API tokens, CORS) in sanity.io/manage are read-only or absent.

## 6. What only the Studio hides (for the record)

These are conveniences, not security. As Editor, using Sanity's own API, confirm you _can_ still read the
`redirect` and `form` documents and delete a page. If you can't, Sanity's rules are stricter than the
README says: update its matrix.

## Clean up

Delete the throwaway project in sanity.io/manage and remove the three test accounts.
