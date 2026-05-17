# Feature Landscape: Private Community Marketplace (FriendSwap)

**Domain:** Private friend-group item sharing / free & cheap goods marketplace
**Researched:** 2026-05-17
**Confidence:** HIGH for table stakes and anti-features (well-established space); MEDIUM for differentiators specific to friend-group scale

---

## Context

This analysis covers the 5–20 person trusted-friend-circle use case — not Nextdoor, not public OfferUp, not Craigslist. The closest real-world analogs are:

- Buy Nothing Project (Facebook groups or the Buy Nothing app)
- Small private Facebook group marketplaces
- Signal/WhatsApp group item-sharing (the friction baseline this replaces)
- Olio (UK free item sharing app)
- Bunz (trading community app)

The key insight: **the competition is a group chat.** Users posting to a WhatsApp thread is the fallback. Every feature must beat that experience, not match Facebook Marketplace.

---

## Table Stakes

Features users expect. Missing = product feels incomplete or no better than a group chat.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Browse all active listings | Core loop — see what's available | Low | Must be the default landing view |
| Post a listing with photo | Without a photo, items don't move — learned from all buy-nothing groups | Low-Med | 1 photo is fine; zero photos is a dealbreaker |
| Title + description + price (optional) | Minimum context to know if you want it | Low | Price "free" should be visually distinct from priced items |
| Poster name + contact info | How you actually claim the item | Low | The app replaces in-group-chat posting; contact moves outside |
| Date listed | Users want to know freshness; stale listings erode trust | Low | Auto-capture on create; display as relative time ("3 days ago") |
| Mark item as taken/claimed | Prevents people chasing already-gone items — #1 pain point in group chats | Low | Must be visible at a glance on the listing card; struck-through or badged |
| Mobile-friendly layout | Majority of casual browsing and posting happens on phones | Low-Med | Responsive layout, thumb-friendly tap targets, no horizontal scroll |
| Closed/private access | This is a trust group — public access destroys the use case | Low | Invite link (secret token) is the right mechanism at this scale |
| Admin can remove any listing | Spam, accidental posts, inappropriate content — moderator needs a lever | Low | Separate admin credential; no need for complex roles at this scale |

---

## Differentiators

Features that meaningfully improve over a group chat or basic listing board. Not expected by default, but add real value in the friend-group context.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| "Taken" badge visible on browse grid | In group chats, claimed items still clutter the thread. Filtering out taken items at a glance is a genuine UX win | Low | Toggle to show/hide taken items — low complexity, high payoff |
| Listing creation under 60 seconds | The #1 reason people don't bother is friction. Fewer fields = more posts | Low | Validate: title + photo + contact is the minimum viable post |
| Relative timestamps ("2 days ago") | Feels alive. Absolute dates feel clinical | Low | Trivial to implement, noticeably better feel |
| Items sorted newest-first by default | People check back for new items; chronological reverse is the right default | Low | No algorithm needed — simple sort |
| Clear "FREE" vs priced distinction | In free-item communities, price visibility reduces awkwardness | Low | Visual label or color badge; don't bury price in description |
| Taken items stay visible (grayed out) | Shows community activity; lets latecomers see what they missed; social proof | Low | Option: fade/badge taken items rather than delete them |

---

## Anti-Features

Features to deliberately NOT build. Each one adds surface area without enough value at 5–20 person scale.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| In-app messaging / DM | Adds auth complexity, notification infrastructure, and moderation surface. Friends already have Signal/iMessage | Poster puts phone/email in the listing; contact moves outside the app |
| User accounts / sign-up | Every step of a sign-up flow loses users. The trust boundary is the invite link, not an account | Invite link (secret token) is sufficient for a closed friend group |
| Multiple photos per listing | Encourages over-production of listings; increases storage costs; slows down posting | One good photo with a clear description beats five mediocre photos |
| Comments / reactions on listings | Becomes a chat thread; hard to moderate; notification complexity explodes | Single contact method per listing keeps it simple |
| Search and filters | At 5–20 items, search is cognitive overhead, not help. Users scan the whole list | If list grows past ~50 items consistently, add as v2 feature |
| Payment processing / escrow | Completely out of scope for informal friend exchange; legal/compliance weight | Informal cash/Venmo/no-money between friends; not the app's concern |
| Push notifications | Requires service workers, browser permission prompts, or a native app; big infrastructure lift | Friends can bookmark the URL and check periodically |
| Categories / tags | At 5–20 items, taxonomy creates false structure. Items don't need to be classified | Free-text title + description is sufficient; categorize in v2 if needed |
| Watchlist / favorites | Implies returning users with persistent state; requires identity the app deliberately avoids | If you want an item, contact the poster directly |
| Automated item expiry | Complex to get right; annoys posters if item expires before sold; poster handles marking taken | Let posters manage their own listings; admin cleans up if needed |
| Social profiles / ratings | Overkill for a trust-already-exists friend group; ratings presuppose strangers | Friend group trust is established outside the app |
| "Boost" / featured listings | Pay-to-play mechanics poison the vibe of a free-sharing community | Chronological sort treats all listings equally |

---

## Feature Dependencies

```
Invite link access
  └─> All other features (nothing works without access control)

Create listing
  └─> Browse listings (need items to browse)
  └─> Mark as taken (need a listing to mark)

Mark as taken
  └─> Taken badge on browse grid (visual representation of taken state)

Admin login
  └─> Delete any listing (admin power requires separate auth)

Photo upload
  └─> File storage infrastructure (needs a place to store images)
```

---

## MVP Recommendation

Given the PROJECT.md decisions already made, the MVP is already well-scoped. Validation priority:

**Must ship in MVP:**
1. Browse active listings (grid/list view, newest first, taken items visually distinguished)
2. Create listing (title, description, 1 photo, optional price, name + contact)
3. Mark item as taken (poster can update their own listing)
4. Admin delete (separate credentials)
5. Invite-link access gate

**High-value additions that are low complexity (consider for MVP):**
- Relative timestamps ("3 days ago") instead of raw dates — trivial, noticeably better
- Visual "FREE" badge when price is empty — trivial, reduces cognitive load
- Toggle to hide taken items — low complexity, high payoff once the list has several taken items

**Defer (v2 or never):**
- Search/filter: wait until the list consistently exceeds ~50 items
- Comments/reactions: re-evaluate only if users explicitly ask; most won't
- Multiple photos: only if posters complain items aren't moving due to poor photo quality

---

## Observations From Analog Apps

**Buy Nothing app:** The primary friction complaint is that the app requires an account, location verification, and profile photo. Users who love the concept hate the onboarding. FriendSwap's invite-link model directly solves this.

**Facebook group marketplaces:** The main pain is that taken/sold items stay in the feed indefinitely (unless poster edits), and notifications are noisy. FriendSwap's explicit taken-status solves the first; no notifications solves the second.

**Group chats (WhatsApp/Signal):** Items get buried. No way to see the current state of what's available. The browse grid is the entire value proposition over this baseline.

**Olio:** Excellent discovery of neighborhood free items, but public-facing and requires accounts. The trust is built into proximity (geolocation), not into a closed group. Different use case.

---

## Sources

- Domain knowledge from Buy Nothing Project app, Olio, Bunz, Facebook group marketplace UX patterns (HIGH confidence — well-documented consumer space)
- PROJECT.md decisions confirmed and incorporated (HIGH confidence — source of truth)
- Anti-features informed by common small-app complexity traps and the explicit PROJECT.md "Out of Scope" decisions
