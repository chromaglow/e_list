# Phase 3 Discussion Log

**Date:** 2026-05-18
**Areas discussed:** Mark taken UX, Browse filter, Admin delete UI, Invite regeneration

---

## Mark Taken UX

**Q: How should "Mark as taken" work when the poster views their own listing?**
> Button on the card — appears directly on the listing card when localStorage edit token matches.

**Q: What happens to taken listings in the browse feed?**
> Hide immediately — taken listings vanish from the active feed.

---

## Browse Filter (LIST-07)

**Q: What filter options should the browse page offer?**
> Active / Taken / All tabs — three tab buttons across the top of the feed.

**Q: User mentioned filtering by date — what did they have in mind?**
> Skip it — newest-first sort is enough. No date filter UI needed.

---

## Admin Delete UI (ADMN-03)

**Q: Where should the delete action live for the admin?**
> Delete button on each card in the browse feed — when logged in as admin.

**Q: Should the admin confirm before a listing is deleted?**
> Yes — a simple confirm dialog.

---

## Invite Regeneration (ADMN-04)

**Q: When admin regenerates the invite link, what happens to the old link?**
> Old link stops working immediately — no grace period.

**Q: Where should the Regenerate button live and how is the new link shown?**
> On the /admin page, new full URL shown inline in a copyable text box after regeneration.

---

## Scope Notes

- Date filtering was raised by user but confirmed as out of scope for Phase 3 — newest-first default is sufficient.
- "TAKEN" badge overlay deferred to v2 (LIST-V2-01).
