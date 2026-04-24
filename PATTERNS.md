# Spex — UI patterns

Concrete reference for the rules in `CLAUDE.md`. When in doubt, cite a section here in the PR description.

## 1. Status badges

All status enums across the app render via `<StatusBadge family="..." value="..." />` from `@spex/ui`. The family determines the color palette and the translation key prefix. Never define a per-module color map.

Currently-supported families (keep this list in sync as new enums land):

| Family | Enum values |
|---|---|
| `project` | `active`, `on_hold`, `completed`, `cancelled` |
| `milestone_execution` | `pending`, `in_progress`, `done` |
| `milestone_billing` | `not_yet_due`, `ready_to_bill`, `invoiced`, `paid` |
| `lead` | the 12 lead statuses |
| `supplier_quote` | `draft`, `submitted`, `under_review`, `approved`, `rejected`, `revised` |
| `customer_quote` | `draft`, `sent`, `approved`, `rejected`, `cancelled` |
| `supplier` | `pending_approval`, `active`, `blocked` |
| `task` | the 5 task statuses |
| `task_priority` | `low`, `medium`, `high`, `urgent` |
| `event` | `scheduled`, `cancelled`, `no_show` |
| `variation` | `draft`, `pending_approval`, `approved`, `rejected`, `billed` |
| `rfi` | `open`, `responded`, `closed` |
| `supplier_invoice` | `received`, `matched`, `disputed`, `processed` |
| `payment_request` | the 5 payment request statuses |

Color palette (apply consistently across all families):

- `neutral`: gray — pending / default / inactive
- `info`: blue — in progress / sent / matched
- `success`: emerald — done / paid / won / approved
- `warning`: amber — awaiting / attention
- `danger`: rose — rejected / blocked / disputed / lost
- `muted`: slate — cancelled / archived
- `accent`: violet / teal / sky — for status variants that need their own color (use sparingly)

## 2. Tabs

A page with more than 4 content sections uses `<Tabs>` from `@spex/ui`:

```tsx
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview"><LayoutDashboard /> {t('...')}</TabsTrigger>
    <TabsTrigger value="financials"><Receipt /> {t('...')}</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">…</TabsContent>
  <TabsContent value="financials">…</TabsContent>
</Tabs>
```

Tab triggers always have an icon + Hebrew label. Keep the number of tabs ≤ 5 on mobile.

## 3. Tables

Lists with more than 3 columns use the `<Table>` primitive:

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>שם</TableHead>
      <TableHead className="text-end">סכום</TableHead>
      <TableHead className="text-end">סטטוס</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {rows.map((r) => (
      <TableRow key={r.id}>…</TableRow>
    ))}
  </TableBody>
</Table>
```

Divided-flex rows are reserved for timelines (interactions, events) and card-like items (tasks, RFIs, meetings).

## 4. Empty states

```tsx
<EmptyState
  icon={Inbox}
  title={t('supplierInvoices.empty')}
  cta={canWrite ? { label: t('supplierInvoices.add'), onClick: startAdd } : undefined}
/>
```

## 5. Money

Display with `formatCurrencyILS` from `@spex/ui`. Input via `<MoneyInput>` which formats on blur and strips non-digits on paste.

## 6. Icons

Always `lucide-react`. Common choices:

- Dashboard: `LayoutDashboard`
- Projects: `FolderKanban`
- Clients: `Building2`
- Leads: `Target`
- Suppliers: `Truck`
- Users: `Users`
- Tasks: `ListChecks`
- RFI: `HelpCircle`
- Meetings: `CalendarDays`
- Finance: `Receipt`
- Handover: `Signature`
- Add / create: `Plus`
- Edit: `Pencil`
- Delete: `Trash2`
- Back: `ArrowRight` (RTL — visually "back" points right)

## 7. Forms

- Group fields into sections with `<FieldGroup label="…">` when a form has >5 fields.
- Required fields: asterisk after label (`{t('...')} *`).
- Inline error: `<p role="alert" className="text-sm text-destructive">`.
- Dates: `<input type="date">` for input, `Intl.DateTimeFormat(i18n.language, { dateStyle: 'short' })` for display.
- Phones: `type="tel"`.
- Money: `<MoneyInput>`.

## 8. Page shells

Every top-level page has a consistent header:

```tsx
<PageHeader
  title={t('...')}
  subtitle={optional}
  actions={<Button>{t('...')}</Button>}
  back={optional}
/>
```

## 9. Density scale

- Card padding: `p-4`
- List row: `px-6 py-3`
- Form row gap: `gap-4`
- KPI tile: `p-4`
- Section gap inside a page: `space-y-6`
- Gap between tiles / cards in a grid: `gap-3`

## 10. Visual hierarchy

- `<h1>`: `text-2xl font-bold`
- Card / section title: `text-base font-semibold`
- Row title: `text-sm font-medium`
- Meta / secondary: `text-xs text-muted-foreground`

## 11. Review checklist for every new UI PR

- [ ] Uses `<StatusBadge>` for any enum field (no new STATUS_COLORS records)
- [ ] Lists with >3 columns use `<Table>`
- [ ] Icons on every button / nav / empty state
- [ ] Empty states use `<EmptyState>`
- [ ] Pages with >4 sections use `<Tabs>`
- [ ] Money uses `formatCurrencyILS` / `<MoneyInput>`
- [ ] No hard-coded English in JSX
- [ ] Hebrew label + RTL correct (`ms-*` / `me-*`, not `ml-*` / `mr-*`)
- [ ] Density matches §9
