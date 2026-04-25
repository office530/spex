# Spex — Visual Moodboard (LOCKED)

**Status**: 🔒 Locked 2026-04-25 by Shay
**Direction**: A v1 — *Site Foreman* (clean — no glass, no mesh, no gradient cards)
**Reference mockup**: [apps/web/public/mockups/a-foreman.html](apps/web/public/mockups/a-foreman.html) → http://localhost:5173/mockups/a-foreman.html
**Companion docs**: [DESIGN.md](DESIGN.md) (full spec — to be amended in Phase 66) · [UX_REDESIGN_PLAN.md](UX_REDESIGN_PLAN.md) (phased work plan)

---

## DNA, in one sentence

Industrial slate chrome, safety-orange action color, white cards on a soft slate-50 background, Hebrew Rubik typography, **data-dense** spacing — looks like a tool that runs a construction business, not a marketing site.

## What's in / what's out

| In | Out |
|---|---|
| ✅ Slate-700/900 sidebar | ❌ Dark teal (was current) |
| ✅ Safety orange (#F97316) primary action color | ❌ Teal-700 primary action |
| ✅ Slate-50 page background | ❌ `muted/40` page background |
| ✅ Flat white cards with `border-slate-200 + shadow-sm` | ❌ Glass / `backdrop-blur` cards |
| ✅ Solid color icon-chips (semantic per family) | ❌ Gradient icon-chips |
| ✅ Existing 8-tone pastel `<StatusBadge>` palette (preserved) | ❌ Gradient status pills |
| ✅ Tight density (`py-2.5` table rows, `py-3` list rows) | ❌ Generous padding / `max-w-6xl` container |
| ✅ Sticky frosted top bar (`bg-slate-50/85 backdrop-blur`) | ❌ Mesh-gradient page background |
| ✅ Solid CTA button (`bg-cta-500`, `shadow-sm`) | ❌ Gradient CTA + glow shadow |
| ✅ Rubik (Hebrew-purpose-built) | ❌ Plus Jakarta Sans / Fira Sans |

---

## Tokens (final)

### Color

```css
/* Brand chrome */
--brand-500: #475569;   /* slate-600 — secondary chrome / borders heavy */
--brand-600: #334155;   /* slate-700 — sidebar default text foreground */
--brand-700: #1e293b;   /* slate-800 — sidebar background */
--brand-900: #0f172a;   /* slate-900 — strong text, "השנה" pill */

/* Action color (safety orange) */
--cta-50:  #fff7ed;
--cta-100: #ffedd5;
--cta-500: #f97316;     /* primary CTA, focus ring, active sidebar accents, hyperlinks */
--cta-600: #ea580c;     /* CTA hover */
--cta-700: #c2410c;     /* CTA pressed, deep orange chip text */

/* Page surface */
--background:    #f8fafc;   /* slate-50 — page bg */
--card:          #ffffff;
--border:        #e2e8f0;   /* slate-200 — card borders */
--border-strong: #cbd5e1;   /* slate-300 — hover state */
--foreground:    #0f172a;   /* slate-900 */
--muted:         #f1f5f9;   /* slate-100 — table header bg, hover row */
--muted-fg:      #64748b;   /* slate-500 — secondary text */

/* Status semantics — keep the 8 existing pastel tones from
   packages/ui/src/components/status-badge.tsx
   (neutral / info / success / warning / danger / muted / accent / accent2)
   These are part of the locked direction; do NOT replace.

/* State accents (used directly on tiles / chips, not as full pills) */
--success-bg:  #d1fae5;   /* emerald-100 */
--success-fg:  #065f46;   /* emerald-800 */
--danger-bg:   #ffe4e6;   /* rose-100 */
--danger-fg:   #9f1239;   /* rose-800 */
--warning-bg:  #fef3c7;   /* amber-100 */
--warning-fg:  #92400e;   /* amber-800 */
--info-bg:     #dbeafe;   /* blue-100 */
--info-fg:     #1e40af;   /* blue-800 */
```

### Sidebar (dark slate)

```css
--sidebar-bg:                 #1e293b;   /* slate-800 */
--sidebar-fg:                 #f1f5f9;   /* slate-100 */
--sidebar-muted-fg:           #94a3b8;   /* slate-400 — section labels, inactive links */
--sidebar-hover-bg:           rgba(255,255,255,0.05);
--sidebar-active-bg:          rgba(255,255,255,0.10);
--sidebar-badge-bg:           #f97316;   /* orange pill on counters like "7 משימות" */
--sidebar-divider:            rgba(255,255,255,0.10);
```

No gradient on the sidebar. No glow. Pure flat color.

### Typography

```css
font-family: 'Rubik', system-ui, sans-serif;   /* unchanged from DESIGN.md §3 */

/* Type scale (unchanged from DESIGN.md §3.1) */
h1            : text-2xl font-bold              /* 1.5rem 700 */
hero h1       : text-2xl sm:text-3xl font-bold
section title : text-base font-semibold         /* 1rem 600 */
row title     : text-sm font-medium             /* 0.875rem 500 */
body          : text-sm
meta          : text-xs text-muted-foreground   /* 0.75rem */
KPI value     : text-2xl font-semibold

/* New: numeric tabular feature for KPI numbers + tables */
.nums { font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }
```

### Density

```css
/* Table row    */ px-5 py-2.5         /* tighter than current py-3 */
/* List row     */ px-5 py-3
/* Card         */ p-4 (compact) | p-5 (standard) | p-6 (hero)
/* KPI tile     */ p-4
/* Page section */ space-y-6
/* Tile grid    */ gap-3
/* Form field   */ gap-4
```

### Radius & elevation

```css
--radius-sm: 0.375rem;   /* 6px — chips, inline elements */
--radius:    0.5rem;     /* 8px — buttons, inputs */
--radius-lg: 0.75rem;    /* 12px — cards (was --radius before) */

/* Shadow stack (no big shadows; flat industrial) */
shadow-sm    on cards (default)
shadow-md    on the sticky top bar bottom edge
no shadow-lg / shadow-xl outside modals
```

### Iconography

`lucide-react`, `h-4 w-4` inline default, semantic icon-chips on KPI tiles. Chip = `h-7 w-7 rounded-md bg-{family-100} grid place-items-center` with the 700-tone icon inside. **Solid color, no gradient, no inset highlight.**

### Motion

```css
transition-colors    150ms       /* default for hover */
transition-transform 150ms       /* subtle hover-lift */
hover:-translate-y-0.5           /* on KPI tiles + recent-project cards only */
hover:bg-muted (or muted/60)     /* list rows */
```

No bounce, no scale, no slide-in transitions outside `<SideDrawer>` (Phase 66) and `<Dialog>` (already shipped).

### CTA Button

```html
<!-- Primary -->
<button class="bg-cta-500 hover:bg-cta-600 text-white text-sm font-medium px-4 py-2 rounded-md shadow-sm">
  <i data-lucide="plus" class="w-4 h-4"></i>פרויקט חדש
</button>
```

Solid orange, white text, `shadow-sm`, no glow, no gradient.

### Status pills

Keep the existing `<StatusBadge>` API + 8-tone pastel palette codified in [packages/ui/src/components/status-badge.tsx](packages/ui/src/components/status-badge.tsx) and [PATTERNS.md §1](PATTERNS.md#1-status-badges). **No gradient backgrounds. No inset rings. Solid pastels.**

### Sidebar active link

```html
<!-- The Spex sidebar in v1 uses a clean white-tint highlight, not orange — keeps the chrome calm,
     reserves orange for actionable elements only. -->
<a class="flex items-center gap-3 px-3 py-2 rounded-md text-sm bg-white/10 text-white font-medium">
  <i data-lucide="layout-dashboard" class="w-4 h-4"></i>לוח בקרה
</a>
```

The active link is a flat `bg-white/10` pill, white text. Orange only appears on (a) the logo chip, (b) the user avatar, (c) the count badges in the nav (e.g. "7 משימות"), (d) primary CTAs, and (e) hyperlinks.

### Page top bar

Sticky at top with subtle frost: `bg-slate-50/85 backdrop-blur`. Border-bottom hairline `border-slate-200`. **This is the only place glass treatment is allowed in v1.** Everywhere else: solid white cards on solid slate-50.

### Heading + period selector

Standard heading row:

```html
<div class="flex items-end justify-between">
  <div>
    <h1 class="text-2xl font-bold">לוח בקרה — סקירת מנכ״ל</h1>
    <p class="text-sm text-slate-500 mt-0.5">ראש השבוע · 25 באפריל 2026</p>
  </div>
  <div class="flex items-center gap-2">
    <button class="text-xs font-medium px-3 py-1.5 rounded border border-slate-200 bg-white text-slate-600">השבוע</button>
    <button class="text-xs font-medium px-3 py-1.5 rounded border border-slate-200 bg-white text-slate-600">החודש</button>
    <button class="text-xs font-medium px-3 py-1.5 rounded border border-slate-900 bg-slate-900 text-white">השנה</button>
  </div>
</div>
```

The "active period" button is `bg-slate-900 text-white border-slate-900`. **Not orange** — orange is reserved for primary actions (Create / Send / Issue). Period switching is a viewing control, not an action.

---

## Worked examples (cite the mockup for reference)

The locked mockup at [a-foreman.html](apps/web/public/mockups/a-foreman.html) demonstrates every token above in a real Dashboard layout. When implementing Phase 66+, treat that file as **the visual source of truth** alongside this document.

| Page region | Reference in mockup |
|---|---|
| Sidebar | lines 32–80 |
| Sticky top bar | lines 85–101 |
| Heading + period switcher | lines 104–114 |
| KPI tile (default) | lines 119–125 |
| KPI tile (overdue, danger ring) | lines 128–135 |
| Cards / panels (`Recent projects`, `My tasks`, `Activity`, `Aging`) | lines 159–280 |
| Activity timeline rows (icon-chip + body) | lines 220–254 |
| AR aging buckets | lines 257–276 |
| CTA button (primary action `שלח תזכורת`) | line 273 |

---

## Carry-overs from current `DESIGN.md`

These rules from [DESIGN.md](DESIGN.md) **stay** unchanged — A v1 builds on them, not over them:

- `dir="rtl"` on `<html>` always
- Logical properties (`ms-*` / `me-*`)
- Rubik font + the type scale in [§3.1](DESIGN.md#31-type-scale)
- 8-tone pastel `<StatusBadge>` family palette ([§2.2](DESIGN.md#22-status-tones-pastel-pill-palette))
- Lucide-only iconography ([§6](DESIGN.md#6-iconography))
- Tabs > 4 sections rule ([§7.3](DESIGN.md#73-tabs))
- `<EmptyState>` mandatory ([§12](DESIGN.md#12-empty-states))
- A11y baseline ([§15](DESIGN.md#15-accessibility-baseline))

## What changes from current `DESIGN.md`

- **§2.1 Brand palette**: replace dark-teal tokens with slate + orange tokens above. Specifically:
  - `--primary` was `173 77% 32%` teal → becomes `cta-500` `#f97316`
  - `--sidebar` was `173 40% 12%` dark teal → becomes `brand-700` `#1e293b` slate-800
  - `--hero-from`/`--hero-to` (gradient hero) → **removed** in v1; entity hero pages use solid `bg-slate-100` with a left orange accent strip instead (Phase 69 ProjectEditPage redesign).
- **§5 Radius & elevation**: `--radius` from `0.75rem` → `0.5rem` (slightly tighter; rounded-lg stays at `0.75rem` for cards).
- **§7.2 Hero banner pattern (B)**: replaced. Entity hero in v1 is a solid `bg-slate-100` band with the entity name + a left orange strip; not a gradient.
- **§9.4 Progress bars**: keep `h-1.5 bg-slate-100` track. Fill is solid `bg-cta-500` (was `bg-primary` teal).

These edits land **in Phase 66**, alongside the actual Tailwind config + CSS-variable changes in code. This document is the agreed shape; the code changes are the implementation.

---

## What this means for Phase 66

The locked direction unblocks the foundation primitives PR. Phase 66 ships:

1. New tokens above wired into Tailwind config + [apps/web/src/index.css](apps/web/src/index.css) `:root` CSS variables
2. Updated [DESIGN.md §2 / §3 / §5 / §7.2 / §9.4](DESIGN.md) per the changes listed above
3. Updated [PATTERNS.md](PATTERNS.md) recipes to match
4. The 10 missing primitives ([UX_REDESIGN_PLAN.md §5 Phase 66](UX_REDESIGN_PLAN.md#phase-66--design-system-foundations-unblocks-all-later-phases)) styled in this direction
5. Adoption sweeps (Skeleton, Sonner, hand-rolled status-pill replacement, Dashboard scaffoldNotice removal)

After Phase 66 lands, the actual app's Dashboard (Phase 67) will look like the [a-foreman.html](apps/web/public/mockups/a-foreman.html) mockup — but with live data, role variants, and the new `/my-tasks` route.

---

*Locked. No more direction debate. Iterate within these tokens; if a future need can't be expressed in them, propose an extension in a PR description and we'll amend this doc + DESIGN.md together.*
