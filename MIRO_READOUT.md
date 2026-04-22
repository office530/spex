# Spex — Miro Board Readout

Source: Miro board (https://miro.com/app/board/uXjVG7dcDOs=/) — extracted from frame-by-frame screenshots.
This is the original requirements source. BLUEPRINT.md translates this into entities, UX, and a build plan.

---

## Board 1 — מקורות הגעה (Lead Sources)

| Source | Note |
|---|---|
| אתר אינטרנט (Website) | Google Ads |
| fb leads | Paid FB lead form |
| הפניה (Referral) | Recommendation logging |
| הזנה ידנית (Manual entry) | Recommendation logging |

---

## Board 2 — לוח לידים ומכירות (Leads & Sales Pipeline)

Pipeline stages (right → left in Miro, chronological here):

| # | Stage | Automation |
|---|---|---|
| 1 | ליד חדש — New Lead | Auto WhatsApp on arrival |
| 2 | אין מענה 1 / 2 / 3 — No Answer 1/2/3 | No-answer WhatsApp sequence |
| 3 | פולואפ — Follow-up | Pop lead back at follow-up time |
| 4 | נקבעה פגישת תכנון — Planning Meeting Scheduled | Confirmation + 2 reminders (eve + AM of) |
| 5 | ממתין לקבלת תוכניות — Awaiting Plans | — |
| 6 | הונפקה הצעת מחיר — Quote Issued | Note: only for clients who needed planning and got an accurate pre-estimate |
| 7 | נקבעה פגישת עבודה — Work Meeting Scheduled | Confirmation + 2 reminders |
| 8 | עסקה נסגרה — Deal Won | Auto-create Client + Project (linked) + collection-board row (no date) |
| 9 | אין עסקה + סיבה — No Deal + Reason | Reasons: price too high / bought from competitor / geographic / shipping too expensive |
| 10 | לא רלוונטי — Not Relevant | — |

**Lead type field**: `תכנון / ביצוע` (planning / execution).

**Legend**:
- ⚫ internal automations only
- 🔵 third-party / external automations

**Note on pricing**: quote = recurring group with milestones + % payment per milestone; default layout; auto-hand-off to collections when project closes.

---

## Board 3 — לוח לקוחות (Clients)

Empty frame. Placeholder — fields to be defined.

---

## Board 4 — לוח פרוייקטים (Projects)

**Project type**: `ביצוע / תכנון ביצוע` (execution / planning+execution).

**Milestones (אבני דרך)** — right → left:

1. פרוייקט חדש — ממתין למקדמה + חתימת הסכם (New Project — Awaiting Deposit + Contract Signing)
2. ממתין לרכש ראשוני (Awaiting Initial Procurement)
3. בתכנון רכש והתנעה (Procurement Planning & Kickoff)
4. הריסות (Demolition)
5. בינוי א (Building A)
6. תשתיות (Infrastructure)
7. בינוי ב (Building B)
8. גמרים (Finishes)
9. התקנות (Installations)
10. פינישים (Punch-list)
11. מסירה (Handover)

**Automation under "ממתין לרכש ראשוני"**: auto-task to Shay + Amil for initial planning.

**Features captured in sticky notes**:
- Stage-approval form sent to client via WA + email
- Parent/sub-task hierarchy
- Project spec (recurring group): Shell / Finish / White-material / Pool / Development / Basement / Ground / Floor A / Floor B
- On project creation: auto Drive folder + sub-folders; ability to create more folders from inside the project
- Detail-collection form with a field describing doc receipt
- **Permissions**: each PM sees only their own projects and tasks in their area of responsibility

---

## Board 5 — חשבונות (Customer Invoicing)

Stages (right → left):

| Stage | Note |
|---|---|
| ממתין למועד תשלום (Awaiting Payment Date) | — |
| ממתין להפקת דרישת תשלום (Awaiting Issuing) | — |
| הופק מס / חשבון עסקה (Tax Invoice / Deal Invoice Issued) | — |
| שולם (Paid) | Close with receipt / tax-receipt invoice |
| בוטל (Cancelled) | — |

**Automations**:
- Payment date = 5 days from issuance (default, fixed)
- After 5 days → auto-flip to "overdue" + email/WA with overdue template
- Escalation button sends harsher template via email/WA

---

## Board 6 — יומן אירועים (Events Calendar)

Statuses: `נקבע` (Scheduled) · `בוטל` (Cancelled) · `ברז` (No-show).
Automation on Scheduled: message at moment of scheduling + 2–3 reminders.

---

## Board 7 — משימות (Tasks) — סטטוסי משימה

Statuses (right → left):

1. ממתין לביצוע — Awaiting Execution
2. בעבודה — In Work
3. בוצע — Done
4. ממתין לאישור מנהל — Awaiting Manager Approval
5. בוטל — Cancelled

**Features captured**:
- Parent tasks with optional checklist (each item has execution status)
- Deadline tracking — overdue items flagged red

---

## Board 8 — רשימת ספקים (Suppliers List)

Statuses: `ממתין להסכמה` (Awaiting Approval) · `ספק פעיל` (Active) · `ספק בחסימה` (Blocked).

---

## Board 9 — יומן עבודה (Work Log per Project)

Statuses: `תואם` (Matched) · `בעבודה` (In Work) · `בוצע` (Done) · `בוטל` (Cancelled).

Structure: per-project work log; recurring group to add suppliers; each supplier has execution status + description of work.

---

## Board 10 — הוצאות ספקים לפי פרוייקט (Supplier Expenses per Project)

Stages (right → left):

| Stage | WA Alert |
|---|---|
| ממתין לתשלום — Awaiting Payment | — |
| ממתין לאישור מנהל פרוייקט — Awaiting PM Approval | Notification about payment request |
| אושר ממתין לבק אופיס — Approved, Awaiting Back Office | WA on payment-request approval |
| ממתין לדרישת תשלום — Awaiting Payment Request | Upload payment confirmation + invoice |
| התקבלה דרישת תשלום ממתין לביצוע — Payment Request Received, Awaiting Execution | WA on received |
| שולם — Paid | WA on payment confirmation |

**Note**: option to issue PO from **MORNING** (accounting software) per supplier; linking expense to PO.

---

## Board 11 — תקלות (Tickets / Issues)

Stages (right → left):

1. תקלה חדשה — New
2. בטיפול — In Handling
3. ממתין למנהל — Awaiting Manager
4. טופל — Handled
5. בוטל — Cancelled

**Features**:
- Public web form (no login) to open a ticket
- Flag opener type (manager / client)
- Option to upload images / text

---

## Implied integrations

- **MORNING** (accounting) — PO issuance, expense linking. Vision updated this to **Chashbashvat** as source of truth; MORNING is a secondary option.
- **Google Drive** — auto folder tree per project
- **WhatsApp** — automations throughout
- **Email** — customer-facing (overdue, stage approval)
- **Public web form** — for tickets (no auth)
- Implied **Google Calendar** for the events board

---

## Gap analysis — Miro vs. business vision

**Miro mentions but vision does not**:
- Standalone יומן אירועים (events calendar) → folded into CRM per vision

**Vision adds beyond Miro**:
- BoQ (Bill of Quantities) as first-class entity
- RFQ / supplier-quote comparison with internal discussion
- Meeting minutes → auto-task generation
- Handover protocol as structured doc
- Variations (בלתמים) as distinct flow
- Per-project document library tab (Drive-backed)
- Three-role separation of quote entities (customer / supplier / variation)
- Two-layer finance model (operational vs Chashbashvat)

See BLUEPRINT.md for how these reconcile into the unified design.
