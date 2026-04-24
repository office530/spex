# Spex — design language

The authoritative design reference. `CLAUDE.md` enforces it; `PATTERNS.md` gives code recipes. Every new page, component, or feature MUST match the specifications below.

Design DNA, condensed: **sidebar-nav dashboards** with **hero regions**, **pastel status pills**, **icon-chipped KPIs**, **avatar stacks**, **soft cards**, and **one signature color** (dark teal). Hebrew-first, RTL.

---

## 1. Brand

- **Product name**: Spex (סְפֶּקְס)
- **Tagline (he)**: מערכת ניהול פרויקטים לקבלני שיפוצים
- **Primary audience**: Israeli renovation contractors (CEO, VP, CFO, Office Manager, PM, Foreman)
- **Tone**: confident, operational, calm. Not playful.
- **Language**: Hebrew only for end users. `en.json` is dev fallback. See `CLAUDE.md` §Language.

## 2. Color

### 2.1 Brand palette

| Token | Purpose | HSL |
|---|---|---|
| `--primary` | Signature teal (buttons, links, focus ring) | `173 77% 32%` |
| `--primary-foreground` | Text on primary | `0 0% 100%` |
| `--sidebar` | Sidebar background (dark teal) | `173 40% 12%` |
| `--sidebar-foreground` | Sidebar body text | `0 0% 96%` |
| `--sidebar-muted-foreground` | Sidebar meta / inactive link | `175 15% 70%` |
| `--sidebar-accent` | Sidebar hover / active bg | `173 50% 20%` |
| `--sidebar-active` | Sidebar active link text | `173 77% 45%` |
| `--hero-from` / `--hero-to` | Hero gradient stops | `173 50% 14%` → `173 77% 24%` |
| `--background` | Page body | `0 0% 100%` |
| `--foreground` | Body text | `222.2 84% 4.9%` |
| `--muted` | Soft backdrops, card hover | `210 40% 96.1%` |
| `--muted-foreground` | Secondary text | `215.4 16.3% 46.9%` |
| `--border` | Card / row dividers | `214.3 31.8% 91.4%` |
| `--destructive` | Error state | `0 84.2% 60.2%` |

### 2.2 Status tones (pastel pill palette)

All status pills across the app use **one** of these 8 tones via `<StatusBadge>`. Do NOT introduce new per-module colors.

| Tone | bg | text | Used for |
|---|---|---|---|
| `neutral` | `bg-gray-100` | `text-gray-700` | pending / default / inactive |
| `info` | `bg-blue-100` | `text-blue-800` | in progress / sent / matched |
| `success` | `bg-emerald-100` | `text-emerald-800` | done / paid / won / approved |
| `warning` | `bg-amber-100` | `text-amber-800` | awaiting / attention needed |
| `danger` | `bg-rose-100` | `text-rose-800` | rejected / blocked / disputed / lost |
| `muted` | `bg-slate-100` | `text-slate-600` | cancelled / archived / not relevant |
| `accent` | `bg-violet-100` | `text-violet-800` | follow-up / revised |
| `accent2` | `bg-teal-100` | `text-teal-800` | quote issued / matched |

The canonical family→tone mapping lives in `packages/ui/src/components/status-badge.tsx`. Add a new family there when you add a new enum.

### 2.3 Icon-chip tones (KPI tiles)

Matches the status palette. Saturated-100 bg + 700 text. Use sparingly — one icon tone per tile, chosen semantically (success for money won, warning for pending, etc.).

## 3. Typography

- **Font**: Rubik (Hebrew + Latin, loaded from Google Fonts)
- **Weights**: 300 · 400 · 500 · 600 · 700

### 3.1 Type scale

| Role | Classes | Example |
|---|---|---|
| Page `<h1>` | `text-2xl font-bold` | Dashboard title |
| Hero title | `text-2xl sm:text-3xl font-bold` | Project hero name |
| Section / card title | `text-base font-semibold` | `<CardTitle>` |
| Row title | `text-sm font-medium` | List item primary |
| Body | `text-sm` | Descriptions, notes |
| Meta / secondary | `text-xs text-muted-foreground` | Dates, counts, captions |
| Overline / eyebrow | `text-xs font-medium uppercase tracking-wider` | Sidebar section label |
| KPI value | `text-2xl font-semibold` | Big numbers in tiles |

Never deviate from this scale without explicit reason documented in PR description.

## 4. Spacing & density

- Page section gap: `space-y-6`
- Card padding: `p-4` (tight), `p-6` (spacious — hero, detail panes)
- List row: `px-6 py-3`
- KPI tile: `p-4`
- Form field gap: `gap-4`
- Grid gap (tiles / side-by-side cards): `gap-3`
- Chip / pill padding: `px-2 py-0.5`

## 5. Radius & elevation

- Radius tokens: `--radius: 0.75rem` (was 0.5rem; upped for softer feel)
  - `rounded-sm` = `calc(r - 4px)`; `rounded-md` = `calc(r - 2px)`; `rounded-lg` = `r`; `rounded-2xl` for hero
- Elevation (shadows):
  - No shadow on flat surfaces (lists inside cards)
  - `shadow-sm` on cards (default)
  - `shadow-md` on the hero banner
  - No `shadow-lg` / `shadow-xl` unless explicitly called out (e.g. modal)

## 6. Iconography

- **Library**: `lucide-react` only. No emoji. No other icon set.
- **Default size**: `h-4 w-4` inline in buttons / links / pills; `h-5 w-5` in mobile nav icons; `h-6 w-6` in empty-state hero icons
- **Required on**: every nav link, primary action button, empty state, KPI tile, tab trigger, most list-row action buttons
- **Iconography catalog** (update PATTERNS.md §6 as we add):
  - Dashboard — `LayoutDashboard`
  - Projects — `FolderKanban`
  - Leads — `Target`
  - Clients — `Building2`
  - Suppliers — `Truck`
  - Users — `Users`
  - Tasks — `ListChecks`
  - RFI — `HelpCircle`
  - Meetings — `CalendarDays`
  - Milestones — `Milestone`
  - Finance — `Receipt`
  - Contract value — `Wallet`
  - Variations — `SlidersHorizontal`
  - Handover — `Signature`
  - Primary action — `Plus`
  - Edit — `Pencil`
  - Delete — `Trash2`
  - External link — `ExternalLink`
  - Back (RTL) — `ArrowRight` (since Hebrew reads right-to-left, "back" visually points right)

## 7. Layout

### 7.1 App shell

- **Sidebar (right side in RTL)**: 240px, dark-teal (`bg-sidebar`), groups Workspace / Directory + user card + logout at bottom. Collapses to icon-only top strip below `md`.
- **Main content**: centered in a `max-w-6xl` container, `px-4 sm:px-6 py-6`. Flush against the sidebar, so the sidebar acts as the primary chrome.
- Background of main: `bg-muted/40` to separate from cards which are `bg-card` (white).

### 7.2 Page header pattern

Two styles:

**A. Standard page header** (lists, forms without entity):

```tsx
<div className="flex items-center justify-between gap-4">
  <h1 className="text-2xl font-bold">{t('...')}</h1>
  <Button asChild><Link to="...">{t('...')}</Link></Button>
</div>
```

**B. Hero banner** (entity detail pages — project, lead, client):

```tsx
<div className="rounded-2xl bg-gradient-to-br from-hero-from to-hero-to text-primary-foreground p-6 sm:p-8 shadow-md">
  <div className="flex items-start justify-between gap-4 flex-wrap">
    <div className="space-y-2 min-w-0">
      <div className="text-xs font-medium text-primary-foreground/70">{category}</div>
      <h1 className="text-2xl sm:text-3xl font-bold truncate">{title}</h1>
      <div className="flex items-center gap-3 text-sm text-primary-foreground/80 flex-wrap">
        {metadataBits}
        <StatusBadge ... className="bg-white/15 text-white" />
      </div>
    </div>
    <div className="flex items-center gap-2 shrink-0">{actions}</div>
  </div>
</div>
```

Hero is reserved for entity detail pages; list pages use the standard header.

### 7.3 Tabs

A page with more than 4 content sections uses `<Tabs>`. Tab triggers MUST have an icon + Hebrew label. Cap at ~5 visible tabs on desktop; overflow scrolls horizontally.

## 8. Components inventory (`@spex/ui`)

- `Button` — primary / outline / ghost / destructive; `sm` / default / `lg`
- `Input`, `Label`
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`
- `StatusBadge` — pastel pill driven by (`family`, `value`)
- `KpiTile` — icon chip + label + value + footer slot
- `KpiDelta` — +/- chip with arrow
- `EmptyState` — icon + title + description + optional CTA
- `formatCurrencyILS`, `toDatetimeInput`, `fromDatetimeInput`, `toDateInput`, `fromDateInput`

New patterns get extracted here before landing in the app (see CLAUDE.md §UI).

## 9. Data viz conventions

### 9.1 KPI tiles
Icon chip (top-right) + label (top-left) + big value + optional footer (typically a `<KpiDelta>`). See `<KpiTile>`.

### 9.2 Deltas
`+3 השבוע` in emerald / `-2 השבוע` in rose / `—` in muted. Use `<KpiDelta delta={n} suffix="..." />`.

### 9.3 Avatar stacks (planned)
Team members, attendees — round avatars overlapping left-to-right (RTL: right-to-left in the visual), 20-24 px, `-ms-1` overlap. Overflow chip `+N` in last slot.

### 9.4 Progress
Horizontal progress bars on per-entity headers (milestones `3/11`, handover `4/5`). Use `h-1 bg-muted rounded-full` + `bg-primary` fill. Keep subtle.

## 10. Motion

- Hover: colors transition in 150ms (`transition-colors`), position in 150ms (`transition-transform`)
- KPI tile hover: `hover:-translate-y-0.5`
- List row hover: `bg-muted/60`
- Nav link hover: bg darkens one step; active gets brand teal
- Modals / detail panes (planned): slide-in-from-end 200ms
- No bounce, no easing cutesy-ness. Cubic-bezier default.

## 11. Forms

- Group fields in a `grid gap-4 sm:grid-cols-2` inside `<CardContent className="space-y-4">`
- Required fields: asterisk after label (`{t('...')} *`)
- Inline error: `<p role="alert" className="text-sm text-destructive">`
- Dates: `<Input type="date">` for input, `Intl.DateTimeFormat(i18n.language, { dateStyle: 'short' })` for display
- Datetime: `<Input type="datetime-local">`; persist as ISO via `fromDatetimeInput`
- Phone: `type="tel"`
- Money: `formatCurrencyILS()` for display; plain `type="number"` for input until `<MoneyInput>` lands
- Save/Cancel: bottom-right of `<CardFooter>` (`justify-end gap-2`)

## 12. Empty states

Always use `<EmptyState>`:

```tsx
<EmptyState
  icon={Inbox}
  title={t('supplierInvoices.empty')}
  description={optional}
  cta={canWrite ? { label: t('supplierInvoices.add'), onClick: startAdd } : undefined}
/>
```

Not allowed: bare `<p>עדיין אין X</p>` inside a card body.

## 13. Loading & feedback

- Loading (first paint): muted skeleton or `<p className="text-sm text-muted-foreground p-6 text-center">{t('common.loading')}</p>`
- Saving: button gets disabled + label swaps to `common.saving`
- Errors inline next to the action that failed (not toasts yet — toast/snackbar comes in a future phase)
- Optimistic updates allowed with rollback on failure (see `HandoverPanel` for the pattern)

## 14. RTL conventions

- `dir="rtl"` on `<html>` — always
- Use **logical properties** (`ms-*`, `me-*`, `ps-*`, `pe-*`) over physical (`ml-*`, `mr-*`)
- `text-end` / `text-start` over `text-right` / `text-left`
- Arrow icons: RTL-aware. "Back" points right (`ArrowRight`), "forward" points left (`ArrowLeft`)
- Hebrew-first: any time you need to interleave Hebrew + numbers, prefer the native direction; avoid forcing LTR

## 15. Accessibility baseline

- Focus ring: `focus-visible:ring-2 focus-visible:ring-ring` on interactive elements
- Button size minimum: `h-9` (default) / `h-8` (sm) — both satisfy 40px+ hit area when padded
- Label every form field with `<Label htmlFor>`
- Role + aria-label on icon-only buttons
- Status pills: don't rely on color alone — always show the text label
- Color contrast: WCAG AA minimum (text-foreground on background passes; pastel pills use 800-weight text on 100-weight bg which passes)

## 16. Per-page conventions

| Page | Header | Body |
|---|---|---|
| Login | Centered card, logo above | Form inside card |
| Dashboard | Standard header | Grid of 4 `<KpiTile>` + feed cards (future) |
| List page (Projects, Leads, Clients, Suppliers, Users) | Standard header + search `<Input>` inside a `<Card>` | Divided rows; status pills via `<StatusBadge>` |
| Entity edit | Hero banner | `<Tabs>` split into General / Team / Milestones / Financials / Operations |
| Nested sub-entity (BoQ) | Standard header with Back | Cards per chapter containing rows or `<Table>` |

## 17. Review checklist (mirrored from PATTERNS.md)

Every PR that touches UI must verify:

- [ ] `<StatusBadge>` used for any status field (no per-module STATUS_COLORS)
- [ ] Lists with >3 columns use `<Table>`
- [ ] Icons on every button, nav link, empty state, KPI tile
- [ ] `<EmptyState>` used where the data set is empty
- [ ] Pages with >4 sections use `<Tabs>`
- [ ] Money via `formatCurrencyILS`
- [ ] No hard-coded English in JSX
- [ ] Hebrew-RTL correct (`ms-*` / `me-*`)
- [ ] Density matches §4
- [ ] No new color token without extending this doc first
