# Spex — UI patterns

Concrete code recipes. The authoritative design language (tokens, typography, layout, behavior) is in **`DESIGN.md`** — read that first; this file is the copy-paste companion. When in doubt, cite a section of either here in the PR description.

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
| `audit_action` | `insert`, `update`, `delete`, `select` |
| `automation_rule` | `active`, `inactive` |
| `flag` | derived flags: `overdue`, `cheapest`, `new`, `pinned` — for badges that aren't part of an enum |

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
    <TabsTrigger value="rfi" count={openRfiCount}>
      <HelpCircle /> {t('rfi.title')}
    </TabsTrigger>
    <TabsTrigger value="financials"><Receipt /> {t('financials.title')}</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">…</TabsContent>
  <TabsContent value="rfi">…</TabsContent>
  <TabsContent value="financials">…</TabsContent>
</Tabs>
```

Tab triggers always have an icon + Hebrew label. Keep the number of tabs ≤ 5 on mobile. **`<TabsTrigger>` accepts a `count?: number` prop** that renders an inline pill badge (e.g. "RFI 3"). The badge is hidden when count is 0 / undefined.

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

- Group fields into sections with `<FieldGroup label="…" description="…">` when a form has >5 fields. The primitive ships in `@spex/ui` (Phase 66):

  ```tsx
  import { FieldGroup, Label, Input, MoneyInput } from '@spex/ui';

  <FieldGroup label={t('project.basics')} description={t('project.basicsDesc')}>
    <div>
      <Label htmlFor="name">{t('project.name')} *</Label>
      <Input id="name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
    </div>
    <div>
      <Label htmlFor="contract_value">{t('project.contractValue')} *</Label>
      <MoneyInput
        id="contract_value"
        value={form.contract_value}
        onChange={(v) => setForm({ ...form, contract_value: v })}
      />
    </div>
  </FieldGroup>
  <FieldGroup label={t('project.team')} last>
    {...}
  </FieldGroup>
  ```

- Required fields: asterisk after label (`{t('...')} *`).
- Inline error: `<p role="alert" className="text-sm text-destructive">`.
- Dates: `<DatePicker>` for input, `Intl.DateTimeFormat(i18n.language, { dateStyle: 'short' })` for display.
- Phones: `type="tel"`.
- Money: `<MoneyInput>` — ILS-formatted on blur, strips non-digits on paste.

## 7a. Loading buttons

`<Button loading>` shows an inline spinner and auto-disables. Replaces the previous pattern of manually combining `disabled` + a `<Loader2>` import per page.

```tsx
import { Button } from '@spex/ui';

<Button type="submit" loading={mutation.isPending}>
  {t('common.save')}
</Button>
```

## 8. Page shells

Every top-level page has a consistent header. The `<PageHeader>` primitive ships in `@spex/ui` (Phase 66):

```tsx
import { PageHeader, Button } from '@spex/ui';

<PageHeader
  title={t('projects.title')}
  subtitle={t('projects.subtitle')}
  back={{ href: '/' }}                      // optional — renders ArrowRight + label
  actions={
    <Button asChild>
      <Link to="/projects/new">{t('projects.new')}</Link>
    </Button>
  }
/>
```

For entity edit pages with multi-level breadcrumbs, pair with `<Breadcrumb>`:

```tsx
import { Breadcrumb, BreadcrumbItem, PageHeader } from '@spex/ui';

<div className="space-y-2">
  <Breadcrumb>
    <BreadcrumbItem href="/projects">{t('nav.projects')}</BreadcrumbItem>
    <BreadcrumbItem current>{project.name}</BreadcrumbItem>
  </Breadcrumb>
  <PageHeader title={project.name} actions={...} />
</div>
```

## 8a. Side drawer (peek-without-leaving)

Right-slide detail pane on top of Radix Dialog. Use for task / ticket / supplier quick-look. RTL: visually slides in from the start (right) edge in Hebrew.

```tsx
import {
  SideDrawer,
  SideDrawerTrigger,
  SideDrawerContent,
  SideDrawerHeader,
  SideDrawerTitle,
  SideDrawerDescription,
  SideDrawerBody,
  SideDrawerFooter,
} from '@spex/ui';

<SideDrawer open={taskDetail !== null} onOpenChange={(o) => !o && setTaskDetail(null)}>
  <SideDrawerContent width="md" side="start">
    <SideDrawerHeader>
      <SideDrawerTitle>{task.title}</SideDrawerTitle>
      <SideDrawerDescription>{task.project.name}</SideDrawerDescription>
    </SideDrawerHeader>
    <SideDrawerBody>{...}</SideDrawerBody>
    <SideDrawerFooter>{...}</SideDrawerFooter>
  </SideDrawerContent>
</SideDrawer>
```

## 8b. Date-range picker

Pair of linked DatePickers with from/to validation. Replaces the previous "two side-by-side `<DatePicker>`s" pattern in Reports / ActivityLog / invoice filters.

```tsx
import { DateRangePicker, type DateRange } from '@spex/ui';

const [range, setRange] = React.useState<DateRange>({ from: null, to: null });
<DateRangePicker value={range} onChange={setRange} />
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
