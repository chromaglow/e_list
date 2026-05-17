# FriendSwap

## What This Is

A private web app for sharing free or cheap items with a small, trusted circle of friends. Anyone with the invite link can browse listings and post their own items — no accounts, no sign-up, just a secret URL. The goal is to find good homes for things you no longer need, without the friction of Facebook Marketplace or public listing sites.

## Core Value

Friends can instantly see what's available and who to contact — frictionless posting and browsing within a closed group.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Invite-link access — anyone with the secret URL can browse and post; no account or password needed
- [ ] Any visitor can create a listing with: title, description, 1 uploaded photo, optional price, poster name + contact info
- [ ] Listing date is recorded automatically on creation
- [ ] Poster can mark their own listing as taken/sold (matched by name/contact they entered)
- [ ] All active listings are visible on the main browse page
- [ ] Listings display: photo, title, description, price (if set), poster name + contact, date listed, taken/sold status
- [ ] Admin login (separate credentials) with ability to delete any listing
- [ ] Mobile-friendly layout — friends will use this from their phones

### Out of Scope

- In-app messaging — contact happens outside the app (poster provides phone/email in listing)
- Multiple photos per listing — one photo keeps posting frictionless
- User accounts or profiles — invite link is the only gate
- Payment processing — informal exchange, no transactions in-app
- Search or filtering — not needed at this scale (v2 if the list grows)

## Context

- Closed group of roughly 5–20 friends
- Primarily mobile use (phones)
- Lightweight hosting needed — not enterprise scale, but images need to be stored somewhere
- The "zero trust" access model means the secret invite URL is the only security boundary; treat it accordingly

## Constraints

- **Security**: Invite link is the sole access gate — the URL must be secret and unguessable (use a long random token, not a short slug)
- **Simplicity**: Friends are non-technical; posting must require zero explanation
- **Scale**: Small group, so simple file storage and a lightweight DB are fine

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Invite link only (no accounts) | Lowest friction for a trusted friend group — no sign-up barrier | — Pending |
| Direct photo upload to server | Easier than linking; friends shouldn't need third-party accounts | — Pending |
| Contact happens outside the app | Keeps the app simple; friends already have each other's info | — Pending |
| Separate admin login for mod powers | Owner needs ability to remove any post without full user accounts | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-17 after initialization*
