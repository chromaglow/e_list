# Requirements: FriendSwap

**Defined:** 2026-05-17
**Core Value:** Friends can instantly see what's available and who to contact — frictionless posting and browsing within a closed group.

## v1 Requirements

### Access Control

- [ ] **ACCS-01**: Anyone who navigates to the invite URL can browse all listings and create new ones — visitors without the URL see a 404 or redirect
- [ ] **ACCS-02**: The invite token is a 32-byte cryptographically random value (64 hex chars), validated on every server request via middleware before any route handler runs

### Listings

- [ ] **LIST-01**: User can browse all active listings in a card grid, ordered newest-first
- [ ] **LIST-02**: User can create a listing by entering a title, description, optional price, their name, and contact info — and uploading one photo directly from their device
- [ ] **LIST-03**: Each listing card displays: photo, title, description, price (or FREE badge if no price), poster name and contact info, date listed, and current status
- [ ] **LIST-04**: Listing creation date is recorded automatically and displayed on the card
- [ ] **LIST-05**: Creating a listing issues a one-time edit token stored in the creator's browser localStorage — this token is required to mark the listing as taken/sold
- [ ] **LIST-06**: User can mark their listing as taken or sold by presenting their edit token — the listing is updated in-place, not deleted
- [ ] **LIST-07**: User can toggle the browse page between "all listings" and "active only" (hiding taken/sold items)

### UX

- [ ] **UX-01**: Listings with no price display a visual "FREE" badge instead of a price field
- [ ] **UX-02**: The photo upload step shows a preview of the selected image before the form is submitted
- [ ] **UX-03**: All pages are mobile-friendly — the app is usable on a phone with no horizontal scroll or pinch-zoom required

### Admin

- [ ] **ADMN-01**: Admin can log in with a separate set of credentials (username + bcrypt-hashed password stored in environment variables)
- [ ] **ADMN-02**: Admin session persists across browser refresh via a signed JWT in an HttpOnly, SameSite=Strict cookie
- [ ] **ADMN-03**: Admin can delete any listing from the browse page or listing detail — deleted listings are soft-deleted (status set to 'deleted'), not permanently removed
- [ ] **ADMN-04**: Admin can regenerate the invite URL from the admin panel — the old token is immediately invalidated

---

## v2 Requirements

Deferred — not in current roadmap.

### Listings

- **LIST-V2-01**: Taken and sold listings appear grayed out / dimmed on the browse grid rather than fully removed (social proof — shows community activity)
- **LIST-V2-02**: Listing cards display relative timestamps ("3 days ago") instead of absolute dates
- **LIST-V2-03**: Listings older than 60 days without activity are automatically archived

### UX

- **UX-V2-01**: Poster contact info is hidden behind a "reveal" tap/click (reduces contact-info scraping surface)
- **UX-V2-02**: Browse page includes category or tag filters (only useful once listing count consistently exceeds ~50 items)

### Admin

- **ADMN-V2-01**: Admin dashboard shows listing count, total posters, and recent activity summary

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| In-app messaging | Contact happens outside the app — poster provides phone/email in listing; keeps app simple and avoids messaging infrastructure |
| Multiple photos per listing | One photo keeps posting frictionless; a second photo reduces the barrier to post |
| User accounts or profiles | Invite link is the only gate — no registration flow needed for a trusted friend group |
| Payment processing | Informal cash exchange between friends; no transactions happen in-app |
| Search / full-text filter | Not needed at 5–20 active items; scrolling is faster than searching at this scale |
| Comments or reactions | Most users won't ask for this; adds read-path complexity with unclear payoff |
| Push notifications | Major infrastructure lift; no clear payoff for a friend group who can just check the app |
| OAuth / social login | Admin is the only authenticated user; invite-link guests don't need an account |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ACCS-01 | Phase 1 | Pending |
| ACCS-02 | Phase 1 | Pending |
| ADMN-01 | Phase 1 | Pending |
| ADMN-02 | Phase 1 | Pending |
| LIST-01 | Phase 2 | Pending |
| LIST-02 | Phase 2 | Pending |
| LIST-03 | Phase 2 | Pending |
| LIST-04 | Phase 2 | Pending |
| LIST-05 | Phase 2 | Pending |
| UX-01 | Phase 2 | Pending |
| UX-02 | Phase 2 | Pending |
| UX-03 | Phase 2 | Pending |
| LIST-06 | Phase 3 | Pending |
| LIST-07 | Phase 3 | Pending |
| ADMN-03 | Phase 3 | Pending |
| ADMN-04 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-17*
*Last updated: 2026-05-17 after initial definition*
