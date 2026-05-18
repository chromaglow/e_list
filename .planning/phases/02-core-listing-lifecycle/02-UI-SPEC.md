---
phase: 2
name: Core Listing Lifecycle
status: draft
created: 2026-05-18
design_system: shadcn base-nova / @base-ui/react / Tailwind v4
base_color: neutral (oklch, no hue)
font: Geist (--font-sans)
---

# UI-SPEC: Phase 2 — Core Listing Lifecycle

> Visual and interaction contract for: create listing page, browse page with listing cards, AppHeader "Post an item" link, inline success banner, image preview, and FREE badge.
>
> Source of truth for gsd-executor, gsd-planner, and gsd-ui-auditor.

---

## Design System Baseline

Detected from existing project code. Do not deviate.

| Property | Value | Source |
|----------|-------|--------|
| Component library | `@base-ui/react` primitives via `components/ui/` | `button.tsx` |
| Styling | Tailwind CSS v4, CSS vars via `globals.css` | `globals.css` |
| shadcn preset | `base-nova`, `baseColor: neutral` | `components.json` |
| Font | Geist, `--font-sans`, loaded via `next/font/google` | `layout.tsx` |
| `--radius` | `0.625rem` (10px) | `globals.css @theme` |
| `--radius-sm` | `calc(0.625rem * 0.6)` = ~6px | `globals.css @theme` |
| `--radius-lg` | `var(--radius)` = 0.625rem | `globals.css @theme` |
| Icon library | `lucide-react` | `components.json` |
| Existing button import | `@/components/ui/button` — exports `Button`, `buttonVariants` | `button.tsx` |
| `cn()` utility | `@/lib/utils` | `LoginForm.tsx` |

---

## 1. Layout and Spacing

### 1.1 Spacing Scale

8-point grid. Use multiples of 4px only.

| Token | px | Tailwind class | Use |
|-------|----|----------------|-----|
| 4px | 4 | `p-1` / `gap-1` | Icon internal gaps, tight insets |
| 8px | 8 | `p-2` / `gap-2` | Label-to-input gap, icon-to-text gap |
| 12px | 12 | `p-3` / `gap-3` | Card inner content gaps |
| 16px | 16 | `p-4` / `gap-4` | Page horizontal padding, card list gap |
| 24px | 24 | `p-6` / `gap-6` | Card padding, form section gaps |
| 48px | 48 | `py-12` | Empty state vertical padding (existing pattern) |

### 1.2 Page Shell

All pages inherit this shell (established in Phase 1):

```
<html>  bg-background text-foreground antialiased min-h-screen
  <body>
    <header>  sticky top-0 z-10 border-b bg-background/95 backdrop-blur
              supports-[backdrop-filter]:bg-background/60
      height: h-14 (56px) — derived from py-3 + text-lg content
      inner:  mx-auto max-w-screen-sm px-4 py-3 flex items-center justify-between
    </header>
    <main>  min-h-[calc(100dvh-3.5rem)]
      content well: mx-auto max-w-screen-sm px-4
```

**max-width:** `max-w-screen-sm` (640px) — centered, single column. Established in Phase 1, maintained across all Phase 2 pages.

**No horizontal scroll:** All content must fit within `max-w-screen-sm px-4`. No fixed-width elements wider than the viewport.

### 1.3 Browse Page Layout (LIST-01)

```
<main class="min-h-[calc(100dvh-3.5rem)]">
  zero-state:
    <EmptyState>  (existing component — no changes)
      mx-auto max-w-screen-sm px-4 py-12 text-center

  with listings:
    <div class="mx-auto max-w-screen-sm px-4 py-4 space-y-4">
      <ListingCard />  (repeating, space-y-4 = 16px gap)
      <ListingCard />
      ...
    </div>
</main>
```

Decision source: D-05 (single-column full-width, 1 card per row). Space between cards: `space-y-4` (16px).

### 1.4 Create Listing Page Layout (LIST-02)

```
/[token]/new  — full-screen page, not a modal (D-01)

<main class="min-h-[calc(100dvh-3.5rem)]">
  <div class="mx-auto max-w-screen-sm px-4 py-6">
    <h2 class="text-lg font-semibold mb-6">Post an item</h2>
    <form class="space-y-5">
      [fields]
      [photo preview — when file selected]
      [success banner — when submitted]
      [submit button]
    </form>
  </div>
</main>
```

Vertical rhythm inside form: `space-y-5` (20px) between field groups. Within each field group: `space-y-1.5` (6px) between label and input — matches LoginForm pattern exactly.

---

## 2. Typography

### 2.1 Type Scale

Exactly 4 sizes used in Phase 2:

| Role | Size | Weight | Line-height | Tailwind | Use |
|------|------|--------|-------------|---------|-----|
| Page heading | 18px / `text-lg` | 600 / `font-semibold` | 1.75rem | `text-lg font-semibold` | "FriendSwap" in header, "Post an item" h2 |
| Card title | 16px / `text-base` | 600 / `font-semibold` | 1.5rem | `text-base font-semibold` | Listing title on card |
| Body / label | 14px / `text-sm` | 400 / `font-normal` | 1.25rem | `text-sm` | Form labels, card description, contact info, date |
| Badge / micro | 12px / `text-xs` | 600 / `font-semibold` | 1rem | `text-xs font-semibold` | FREE badge, status badge, file input hint |

No other font sizes. Do not introduce `text-xl`, `text-2xl`, or `text-base font-medium` — not part of this phase's type scale.

### 2.2 Font Weights

Exactly 2 weights:
- **Regular:** `font-normal` (400) — body text, labels, descriptions, dates, contact info
- **Semibold:** `font-semibold` (600) — headings, card titles, badge text, button text

### 2.3 Line Heights

- Body text and labels: default Tailwind leading (`leading-normal`, 1.5) — do not override
- Page/card headings: default Tailwind leading for `text-lg`/`text-base` — do not override
- Description line-clamp: `line-clamp-2` — exactly 2 lines of text, ellipsis on overflow (D-06)

### 2.4 Muted Text

Use `text-muted-foreground` (`oklch(0.556 0 0)` in light mode) for:
- Card date
- File input hint text ("Optional — JPEG, PNG, or WebP")
- Form field helper text (if any)
- EmptyState paragraphs (existing pattern, no change)

---

## 3. Color and Theming

### 3.1 Surface Allocation (60/30/10)

| Role | CSS var | Hex approx | Share | Applied to |
|------|---------|------------|-------|-----------|
| Dominant surface | `--background` (`oklch(1 0 0)`) | #ffffff light | 60% | Page body, form background |
| Secondary surface | `--card` (`oklch(1 0 0)` light / `oklch(0.205 0 0)` dark) | Card surface | 30% | Listing card, form card wrapper if used |
| Accent | `--primary` (`oklch(0.205 0 0)` light) | Near-black | 10% | Submit button, "Post an item" link button ONLY |

The design is intentionally neutral/monochrome. No brand accent color is introduced in Phase 2.

### 3.2 FREE Badge Color

**Semantic color: emerald/green** — the only non-neutral color in Phase 2. Uses Tailwind semantic classes, not CSS vars (CSS vars do not include green in this preset).

```
Light mode:  bg-emerald-100 text-emerald-800
Dark mode:   dark:bg-emerald-900/30 dark:text-emerald-400
```

Full class string: `inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400`

Reserved for FREE badge ONLY. Do not use green/emerald anywhere else in Phase 2.

### 3.3 Status Badge (active)

Phase 2 only surfaces `active` status listings (LIST-01 query filters to active only). The "active" status badge is not displayed on cards in Phase 2 — only price/FREE is shown. Status badge display is deferred to Phase 3 when taken/sold statuses become visible.

Decision: Do not render a status badge on Phase 2 cards.

### 3.4 Success Banner Color

Emerald green — same semantic as FREE badge, consistent signal for "good outcome."

```
bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-4 py-3
dark: dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300
```

Contains: CheckCircle icon (lucide, `size-4`) + text message. Icon and text in same color.

### 3.5 Error State Color

```css
text-destructive  /* oklch(0.577 0.245 27.325) — red */
```

Matches LoginForm error pattern exactly: `<p role="alert" class="text-sm text-destructive">`.

### 3.6 Border / Input / Card

| Element | CSS var class | Usage |
|---------|--------------|-------|
| Input border | `border` (uses `--border` via global `* { border-color: hsl(var(--border)) }`) | All form inputs |
| Focus ring | `focus:ring-2 focus:ring-ring` | All form inputs — matches LoginForm |
| Card border | `border` | ListingCard outer border |
| Card shadow | `shadow-sm` | ListingCard — same as LoginForm card |
| Card background | `bg-card` | ListingCard surface |

---

## 4. Component Contracts

### 4.1 AppHeader (modified)

Convert disabled Button to a Next.js Link styled as a button.

```tsx
// @base-ui/react Button does not implement Radix asChild — use buttonVariants() instead
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

<header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
  <div className="mx-auto max-w-screen-sm px-4 py-3 flex items-center justify-between">
    <h1 className="text-lg font-semibold tracking-tight">FriendSwap</h1>
    <Link href={`/${token}/new`} className={buttonVariants()}>
      Post an item
    </Link>
  </div>
</header>
```

- Remove `disabled`, `cursor-not-allowed`, `aria-label="...coming..."`, `title="Coming soon"` from Phase 1
- AppHeader gains `{ token: string }` prop — passed from browse page and new listing page
- No size override — uses `buttonVariants()` default (h-8, text-sm, font-medium)
- Touch target: h-8 = 32px. On mobile, browsers extend tap target by ~8px on each edge. Acceptable for a header action.

### 4.2 ListingCard Anatomy

```
<article class="rounded-lg border bg-card shadow-sm overflow-hidden">

  ┌─────────────────────────────────────────┐
  │  PHOTO  (4:3 aspect ratio, full width)  │
  │  aspect-[4/3] w-full bg-muted           │
  │  <Image fill object-cover loading=lazy> │
  └─────────────────────────────────────────┘
  ┌─────────────────────────────────────────┐
  │  CONTENT  (px-4 pt-3 pb-4)             │
  │                                         │
  │  [Title]          [Price or FREE badge] │
  │  text-base font-semibold  inline-flex   │
  │                                         │
  │  [Description — 2 line clamp]           │
  │  text-sm text-muted-foreground          │
  │  line-clamp-2 mt-1.5                    │
  │                                         │
  │  [Poster name · Contact info]           │
  │  text-sm mt-3                           │
  │                                         │
  │  [Date]                                 │
  │  text-xs text-muted-foreground mt-1     │
  └─────────────────────────────────────────┘
```

**Full class specification:**

```tsx
<article className="rounded-lg border bg-card shadow-sm overflow-hidden">
  {/* Photo */}
  <div className="relative aspect-[4/3] w-full bg-muted">
    <Image
      src={listing.photo_key ?? '/fallback.jpg'}
      alt={listing.title}
      fill
      className="object-cover"
      loading="lazy"
      sizes="(max-width: 640px) 100vw, 640px"
    />
  </div>

  {/* Content */}
  <div className="px-4 pt-3 pb-4">
    {/* Title row */}
    <div className="flex items-start justify-between gap-3">
      <h2 className="text-base font-semibold leading-snug">{listing.title}</h2>
      {listing.price
        ? <span className="text-sm font-normal shrink-0">{listing.price}</span>
        : <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 shrink-0">FREE</span>
      }
    </div>

    {/* Description */}
    <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
      {listing.description}
    </p>

    {/* Poster info */}
    <div className="mt-3 text-sm">
      <span className="font-normal">{listing.poster_name}</span>
      <span className="mx-1.5 text-muted-foreground">·</span>
      <span className="text-muted-foreground">{listing.contact_info}</span>
    </div>

    {/* Date */}
    <time
      dateTime={listing.created_at.toISOString()}
      className="mt-1 block text-xs text-muted-foreground"
    >
      {formatDate(listing.created_at)}
    </time>
  </div>
</article>
```

**Date format:** `"May 18, 2026"` — via `toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })`

**Image fallback:** `/fallback.jpg` (static asset, user supplies before Phase 2 ships). Card always shows an image — never an empty photo slot (D-09).

**No status badge in Phase 2.** Browse page only shows `status = 'active'` listings. Status rendering is Phase 3 work.

### 4.3 CreateListingForm Fields

Form is a `'use client'` component. Field order matches user mental model: what the item is → optional details → who's posting → how to reach them → photo.

```
[Title *]
  label: "Title"
  input: type="text" placeholder="e.g. Standing desk, wool blanket..."
  maxLength={200}

[Description *]
  label: "Description"
  textarea: placeholder="What's the condition? Any size or colour details?"
  rows={3}
  maxLength={2000}

[Price]
  label: "Price (leave blank for FREE)"
  input: type="text" placeholder="e.g. $20 or 'make an offer'"
  maxLength={100}
  note: truly optional — no asterisk

[Your name *]
  label: "Your name"
  input: type="text" placeholder="e.g. Sam"
  maxLength={100}

[Contact info *]
  label: "How to reach you"
  input: type="text" placeholder="e.g. text 555-0123 or sam@email.com"
  maxLength={200}

[Photo]
  label: "Photo (optional)"
  input: type="file" accept="image/jpeg,image/png,image/webp" capture="environment"
  helper: "JPEG, PNG, or WebP · max 8 MB"

[Image preview]  — visible only when file is selected (UX-02)
  <img src={previewUrl} alt="Preview" class="w-full aspect-[4/3] rounded-lg object-cover mt-2" />
  Use <img> (not next/image) for the preview — it's a local blob: URL

[Success banner]  — visible after successful submit (D-02)
  see §4.4

[Submit button]
  "Post item" when idle
  "Posting…" when isPending
  disabled + opacity-50 when isPending (built into buttonVariants disabled style)
  className="w-full" + size default
```

**Input class string (consistent with LoginForm):**
```
w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring
```

**Textarea class string:**
```
w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-none
```

**Label class string:**
```
text-sm font-medium
```

**Field group wrapper:**
```
<div class="space-y-1.5">
  <label ...>
  <input ...> or <textarea ...>
  [optional helper text: text-xs text-muted-foreground mt-1]
</div>
```

**Required field indicator:** Asterisk in label text only — no `required` visual icon. Example: `"Title"` not `"Title *"` in label text, but field IS required at server validation. Omit asterisk UI — the form is simple enough that users understand all named fields should be filled.

### 4.4 Success Banner (D-02, D-03)

Appears between the photo field and the submit button after successful form submission. Clears when form resets (D-03).

```tsx
{success && (
  <div
    role="status"
    aria-live="polite"
    className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
  >
    <CheckCircle className="size-4 shrink-0" />
    Your listing is posted!
  </div>
)}
```

Icon: `CheckCircle` from `lucide-react`, `size-4` (16px).
Duration before form resets: 3000ms (3 seconds), then form.reset() and success flag clears simultaneously.

### 4.5 Image Preview (UX-02)

Displayed immediately when user selects a file (onChange). Positioned below the file input, above the submit button.

```tsx
{previewUrl && (
  <div className="mt-2 overflow-hidden rounded-lg">
    <img
      src={previewUrl}
      alt="Preview"
      className="w-full aspect-[4/3] object-cover"
    />
  </div>
)}
```

- Uses plain `<img>` — not `next/image`. The `src` is a `blob:` URL from `URL.createObjectURL()`, which Next.js Image cannot handle.
- `aspect-[4/3]` — matches the card image ratio for visual consistency.
- `object-cover` — crops to fill the ratio without distortion.
- Revoke the object URL on file change (new selection) and on unmount.

### 4.6 Photo Upload File Input Styling

The native `<input type="file">` is visually styled using a wrapping label pattern to match the form aesthetic.

```tsx
<div className="space-y-1.5">
  <label htmlFor="photo" className="text-sm font-medium">
    Photo <span className="font-normal text-muted-foreground">(optional)</span>
  </label>
  <input
    id="photo"
    type="file"
    accept="image/jpeg,image/png,image/webp"
    capture="environment"
    className="w-full rounded-md border bg-background px-3 py-1.5 text-sm text-muted-foreground file:mr-3 file:rounded-sm file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:font-medium file:text-foreground cursor-pointer"
  />
  <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP · max 8 MB</p>
</div>
```

---

## 5. Interaction and States

### 5.1 Submit Button States

| State | Visual | Class delta |
|-------|--------|-------------|
| Idle | "Post item" — full opacity, clickable | `<Button type="submit" className="w-full">Post item</Button>` |
| Pending (isPending) | "Posting…" — 50% opacity, pointer-events-none | `disabled={isPending}` — `buttonVariants` applies `disabled:pointer-events-none disabled:opacity-50` automatically |
| Success | Form resets at 3s — button returns to Idle | — |

Do not change button color or add a spinner. Opacity reduction + text change is sufficient loading feedback for a mobile-first invite-only app.

### 5.2 Form Field Error States

Inline error below the submit button for server-level errors. Matches LoginForm pattern:

```tsx
{error && (
  <p role="alert" className="text-sm text-destructive">
    {error}
  </p>
)}
```

Field-level validation is not shown in Phase 2 — server returns 400 on invalid input, which maps to the generic error message. No per-field `aria-invalid` rings in Phase 2 (the form is simple and submit-triggered validation is sufficient).

Exception: magic byte validation fails client-side before submit. Error is shown in the same `<p role="alert">` element with the file-specific message.

### 5.3 Image Loading on Cards

- All card images: `loading="lazy"` — prevents eager loading of all photos on page load
- During lazy load, the photo container shows `bg-muted` (`oklch(0.97 0 0)`) as a neutral placeholder
- No skeleton animation — the muted background is the loading state

### 5.4 Empty Browse State

When no active listings exist, renders `<EmptyState />` unchanged from Phase 1:

```
"Nothing here yet."
"Listings will appear here once friends start posting."
```

Class: `mx-auto max-w-screen-sm px-4 py-12 text-center` — no changes.

### 5.5 Focus Management

- All interactive elements use `focus:ring-2 focus:ring-ring` (inputs/textarea) or the built-in `focus-visible:ring-3 focus-visible:ring-ring/50` from `buttonVariants`
- No custom focus outline suppression
- Tab order follows DOM order — no `tabIndex` overrides

### 5.6 "Post an item" Header Link

- Default state: renders as styled link — same visual as Phase 1 button (dark bg, light text)
- No hover state beyond what `buttonVariants()` default provides (no explicit hover class needed — `[a]:hover:bg-primary/80` is part of the default variant)
- No loading state for navigation — it's a link, not an action

---

## 6. Copy and Labels

### 6.1 Primary CTA

| Location | Text | Element |
|----------|------|---------|
| AppHeader | "Post an item" | `<Link>` styled as Button |
| Create page submit | "Post item" | `<Button type="submit">` |
| Create page submit (pending) | "Posting…" | same button, disabled |

Note the distinction: Header says "Post an item" (navigational call to action), form submit says "Post item" (action verb + noun without article, conventional form submit label).

### 6.2 Form Labels and Placeholders

| Field | Label | Placeholder | Helper text |
|-------|-------|-------------|-------------|
| Title | "Title" | "e.g. Standing desk, wool blanket…" | — |
| Description | "Description" | "What's the condition? Any size or colour details?" | — |
| Price | "Price" | "e.g. $20 or 'make an offer'" | — |
| Poster name | "Your name" | "e.g. Sam" | — |
| Contact info | "How to reach you" | "e.g. text 555-0123 or sam@email.com" | — |
| Photo | "Photo" + "(optional)" | — | "JPEG, PNG, or WebP · max 8 MB" |

The price label does NOT say "leave blank for FREE" — the placeholder does the work. Label stays short: "Price".

### 6.3 Success Message (D-02)

"Your listing is posted!"

Exact string. No period variation. No emoji. No mention of edit token.

### 6.4 Error Messages

| Trigger | Message |
|---------|---------|
| Invalid file type (client-side magic byte check) | "Please select a JPEG, PNG, or WebP image." |
| Network / upload failure | "Upload failed — please try again." |
| Server error on listing create (non-400) | "Something went wrong. Please try again." |
| Server 400 (invalid input) | "Please check your entries and try again." |

All errors rendered in `<p role="alert" class="text-sm text-destructive">`.

### 6.5 Page Heading

Create listing page: `<h2 class="text-lg font-semibold mb-6">Post an item</h2>`

No separate page `<title>` change required — inherits "FriendSwap" from root layout.

### 6.6 FREE Badge Text

"FREE" — all caps, exact. No period, no lowercase variation.

### 6.7 Date Format

"May 18, 2026" — `toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })`. Wrapped in `<time dateTime={iso}>`.

### 6.8 Card Accessibility Labels

`<article>` is the card wrapper. No explicit `aria-label` on article — the heading `<h2>` inside provides the accessible name via implicit association. Screen readers will announce: "[title] — article."

Photo `alt` text: `listing.title` — the most informative available string.

---

## 7. Decisions Registry

| Decision | Source | Value | Re-ask? |
|----------|--------|-------|---------|
| Single-column card layout | D-05 | 1 column, `space-y-4` gap | LOCKED |
| Line-clamp on description | D-06 | `line-clamp-2` | LOCKED |
| No detail page | D-07 | Card is full experience | LOCKED |
| Separate full-screen create page | D-01 | `/[token]/new` | LOCKED |
| Inline success banner | D-02 | Stays on page, localStorage silent | LOCKED |
| Form resets after banner | D-03 | 3000ms delay, then reset | LOCKED |
| Edit token to localStorage | D-04 | `edit_token_${id}` | LOCKED |
| Photo upload on submit | D-08 | Not on file pick | LOCKED |
| Photo optional + fallback | D-09 | `/fallback.jpg` | LOCKED |
| Card photo aspect ratio | Discretion | `aspect-[4/3]` | Spec decision |
| Success banner color | Discretion | emerald green | Spec decision |
| FREE badge color | Discretion | emerald green | Spec decision |
| Submit button label | Discretion | "Post item" | Spec decision |
| Error copy | Discretion | See §6.4 | Spec decision |
| No status badge in Phase 2 | Discretion | Deferred to Phase 3 | Spec decision |
| `asChild` unavailable | OQ-02 (RESEARCH) | Use `buttonVariants()` on `<Link>` | Spec decision |

---

## 8. Registry Safety Gate

No third-party shadcn registries declared. `components.json` → `"registries": {}`.

All components used in Phase 2 are:
- Existing project components (`Button`, `AppHeader`, `EmptyState`)
- New project-specific components (`ListingCard`, `CreateListingForm`)
- Standard library primitives (`next/image`, `lucide-react`)

Safety gate: **not applicable — no third-party blocks.**

---

## 9. next.config.ts Change Required

The current `next.config.ts` has no `images.remotePatterns`. Phase 2 requires this addition for `<Image>` to accept Vercel Blob CDN URLs:

```typescript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '*.blob.vercel-storage.com',
      port: '',
      pathname: '/**',
    },
  ],
},
```

Without this, the browse page will throw a 400 error for any listing with a photo. This is a required config change, not optional.

---

## Appendix: Pre-population Sources

| Decision | Source | Count |
|----------|--------|-------|
| D-01 through D-09 | `02-CONTEXT.md` Decisions | 9 |
| max-w-screen-sm, px-4 shell | `02-RESEARCH.md` Pattern 3 code sample | 2 |
| min-h-[calc(100dvh-3.5rem)] | `02-RESEARCH.md` Pattern 3 code sample | 1 |
| CSS vars, radius, font | `globals.css`, `layout.tsx` | full token set |
| Input class string | `LoginForm.tsx` established pattern | 1 |
| buttonVariants() for links | `02-RESEARCH.md` OQ-02 resolution | 1 |
| `loading="lazy"` on images | `02-RESEARCH.md` Anti-Patterns section | 1 |
| `line-clamp-2` | D-06 | 1 |
| User input in this session | 0 — all pre-populated from upstream | — |

---

*Phase: 2 — Core Listing Lifecycle*
*UI-SPEC authored: 2026-05-18*
*Status: draft (awaiting gsd-ui-checker approval)*
