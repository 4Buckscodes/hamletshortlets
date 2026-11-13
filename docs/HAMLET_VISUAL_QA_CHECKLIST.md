# HAMLET Visual Refresh — QA Checklist

Run these checks on the Vercel preview for PR #91 before merge.

## Public guest experience
- [ ] Homepage hero, lagoon illustration and search sheet render at 360px, 390px, 768px, 1280px and 1440px.
- [ ] No horizontal overflow; search sheet opens, validates and closes by Escape/backdrop.
- [ ] Lagos neighbourhood rail scrolls and updates the URL filter.
- [ ] Approved properties still load from Supabase; empty and query-error states remain understandable.
- [ ] Property images, trust badge, prices and availability labels remain grounded in listing data.
- [ ] /stays discovery filters and /stays/[id] details still work.

## Partner and admin
- [ ] /partners and all partner navigation links work at mobile and desktop widths.
- [ ] Existing partner permissions, property pause/resume and sharing actions work.
- [ ] /admin redirects unauthenticated users and blocks non-admin roles.
- [ ] Admin counts remain database-backed and overdue-hold action still works.
- [ ] Existing admin queues and audit history remain accessible.

## Design and accessibility
- [ ] Logo and wordmark contrast correctly on light and dark surfaces.
- [ ] Brass accents are not used for small low-contrast body text.
- [ ] Focus-visible states remain clear.
- [ ] Reduced-motion preference is respected.
- [ ] Screen-reader labels and keyboard navigation work for search, menus and dialogs.

## Engineering
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Browser smoke tests against preview deployment
- [ ] No new Supabase migrations or fee changes required by this visual refresh
