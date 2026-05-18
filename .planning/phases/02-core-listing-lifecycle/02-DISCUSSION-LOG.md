# Phase 2: Core Listing Lifecycle - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-18
**Phase:** 2-core-listing-lifecycle
**Areas discussed:** Create listing entry point, Listing card design, Post-submit flow, Photo upload timing

---

## Create Listing Entry Point

| Option | Description | Selected |
|--------|-------------|----------|
| Separate page (/[token]/new) | Navigate to a full-screen create form. Clean URL, natural back button, no overlay complexity. | ✓ |
| Sheet / bottom drawer | Slides up from the bottom on mobile. Keeps browse context visible. Requires client state. | |
| Modal overlay | Centers on screen. Works on desktop, awkward on mobile for a multi-field form. | |

**User's choice:** Separate page at `/[token]/new`

---

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to browse + toast | Sent back to /{token} with a brief success toast. Edit token saved to localStorage before redirect. | |
| Success screen | Dedicated success page shows confirmation and edit token. | |
| Stay on form, show inline success | Form resets and shows success banner. User stays on the create page. | ✓ |

**User's choice:** Stay on form, show inline success banner

---

| Option | Description | Selected |
|--------|-------------|----------|
| Show token prominently with copy button | Highlighted box with Copy button for the edit token. | |
| Don't show token — store silently in localStorage | Token saved automatically. Users see "Listing posted!" No token shown. | ✓ |
| Show a "bookmark this page" prompt | No token shown. Instruct users the feature only works on this device. | |

**User's choice:** Token stored silently in localStorage — not shown to user

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — form resets so they can post again | Success banner shows briefly, form clears for a new listing. | ✓ |
| No — show success state until they navigate away | Success banner stays until user navigates. Prevents accidental double-posting. | |

**User's choice:** Form resets after success so user can post another item

---

## Listing Card Design

| Option | Description | Selected |
|--------|-------------|----------|
| Full-width stacked cards (1 column) | Photo on top (wide), info below. Easy to scan on a phone. | ✓ |
| 2-column grid | Smaller cards side-by-side. More items visible but cramped on phones. | |
| You decide | Claude picks based on content density. | |

**User's choice:** Full-width stacked cards, 1 column

---

| Option | Description | Selected |
|--------|-------------|----------|
| 2 lines, truncated with ellipsis | Compact cards, consistent height. Tap card to see full description. | ✓ |
| Full description, no truncation | Card height varies. Simpler — no tap-to-expand needed. | |
| You decide | Claude picks based on overall card content. | |

**User's choice:** 2 lines with ellipsis (`line-clamp-2`)

---

| Option | Description | Selected |
|--------|-------------|----------|
| No detail page — cards are the whole experience | All info on the card. No navigation away needed. | ✓ |
| Tapping a card opens a detail page | Full listing on its own route. Better for long descriptions. | |

**User's choice:** No detail page in Phase 2

---

## Post-Submit Flow

Covered within the "Create listing entry point" area above.

---

## Photo Upload Timing

| Option | Description | Selected |
|--------|-------------|----------|
| On submit — upload fires when user taps 'Post' | One submit action does everything. Simpler flow. | ✓ |
| On file pick — upload starts immediately on photo selection | Background upload while form is filled. Feels faster but more complex. | |

**User's choice:** Upload on submit

---

**Photo required?** User clarified verbally: photo is optional. User will provide a static fallback image of their dog (`/public/fallback.jpg`) to display when no photo is provided.

---

## Claude's Discretion

- Card layout details within the single-column constraint (padding, shadow, spacing)
- Whether "Post an item" button becomes a `<Link>` or triggers `router.push`
- Inline success banner appearance (color, icon, duration)
- Loading/pending state on submit button during upload + DB write
- localStorage key naming convention for edit tokens

## Deferred Ideas

None — discussion stayed within phase scope.
