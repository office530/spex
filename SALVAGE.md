# Spex — Salvageable Code Inventory

## 1. Lift-and-refactor (high value)

### Hebrew PDF Generator Boilerplate (jsPDF + RTL Framework)
- **Origin**: `/home/user/renobuild/functions/generateOrderPDF.ts`, `generateLeadPDF.ts`, `generatePaymentRequestPDF.ts`, `generateProjectBudgetPDF.ts`, `generateRFIPDF.ts`, `generateSupplierCardPDF.ts`, `generateCRMReportPDF.ts`, `generateForecastReportPDF.ts`, `generateProjectPDF.ts`, `generateSuppliersReportPDF.ts`, `generateTasksReportPDF.ts`
- **What it does**: Common RTL+Hebrew PDF generation framework using jsPDF 2.5.2, jspdf-autotable 3.8.2, and Rubik font from GitHub CDN.
- **What to keep**:
  - Font loading pattern: Fetch Rubik TTF from GitHub raw (https://github.com/googlefonts/rubik/raw/main/fonts/ttf/Rubik-Regular.ttf), base64 encode via Uint8Array + btoa, add to VFS, register font
  - jsPDF RTL init: `doc.setR2L(true)` after font setup
  - Page dimensions: `pageWidth / pageHeight` from `doc.internal.pageSize.getWidth/Height()`
  - AutoTable styling: `headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], font: 'Rubik' }`
  - Text color scheme: Primary header blue [37, 99, 235], secondary gray [100, 116, 139], text [51, 65, 85], footer [148, 163, 184]
  - Section headers: Font size 14, blue color, right-aligned (`{ align: 'right' }`)
  - Margin pattern: `{ right: 15, left: 15 }` consistently
  - Multi-page footer logic: Loop all pages, add footer at `pageHeight - 10` with center alignment
  - Money formatting: `₪${value.toLocaleString()}` (₪ symbol + toLocaleString)
  - Date formatting: `new Date(isoString).toLocaleDateString('he-IL')`
  - Page overflow checks: `if (yPos > pageHeight - 80) { doc.addPage(); yPos = 20; }`
- **What to rewrite**:
  - Remove all Base44 SDK imports (`createClientFromRequest`, `base44.auth.me()`)
  - Replace auth flow with Supabase/Fastify middleware
  - Remove Deno-specific `Response.json()`; use standard HTTP response
  - Data source: Accept JSON body instead of Base44 entity queries
  - Footer text: "מסמך זה נוצר אוטומטית על ידי מערכת RenoBuild" → update to Spex branding
  - No need for CORS headers in new stack
- **Target location in spex**: `packages/pdf-hebrew/` (shared monorepo package)
- **Effort**: 4-6h (extract common code into `PDFGenerator` base class + `HebrewPDFConfig`, create package exports)

### WhatsApp Integration (Green API Client)
- **Origin**: `/home/user/renobuild/functions/sendWhatsAppTemplate.ts`, `processWhatsAppWebhook.ts`
- **What it does**: Green API integration for WhatsApp; sends templated messages, tracks delivery status, handles incoming messages.
- **What to keep**:
  - Israeli phone normalization function (lines 9-17 sendWhatsAppTemplate.ts):
    ```js
    function formatIsraeliPhoneNumber(phone) {
      let cleaned = ('' + phone).replace(/\D/g, '');
      if (cleaned.length === 10 && cleaned.startsWith('05')) {
        cleaned = '972' + cleaned.substring(1);
      } else if (cleaned.length === 9 && !cleaned.startsWith('972')) {
        cleaned = '972' + cleaned;
      }
      return `${cleaned}@c.us`;
    }
    ```
  - Template variable substitution (replaceVariables function)
  - Green API endpoint pattern: `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`
  - Message status tracking enum: sent → delivered → read / failed
  - Webhook signature validation: Validate `typeWebhook` field (messageData, stateInstanceChanged, statusInstanceChanged)
  - Lead-interaction auto-logging: Convert WA reply to CRM Interaction entity
- **What to rewrite**:
  - Remove Base44 SDK coupling; use Supabase RLS for auth
  - Webhook: Convert from Deno.serve to Fastify route handler
  - Store templates in Supabase instead of Base44 entities
  - Message log: Use Drizzle ORM for persistence
  - CORS headers: Remove (handled by Fastify middleware)
  - Environment variable trimming (`rawIdInstance?.trim()`) suggests tab-character env var issues — validate in Spex config
- **Target location in spex**: `packages/whatsapp-client/`, `server/routes/webhooks/whatsapp.ts`
- **Effort**: 6-8h (extract to standalone client, test with Green API credentials, wire to Supabase)

### Document Numbering Generator
- **Origin**: `/home/user/renobuild/functions/generateDocumentNumber.ts`
- **What it does**: Sequential document numbering with configurable prefixes, stored in system settings; ensures uniqueness via loop-and-increment.
- **What to keep**:
  - Entity mapping (order, payment_request, expense, task) to prefix + field name
  - Prefix + zero-padded number pattern: `${prefix}-${nextNumber.toString().padStart(4, '0')}`
  - Uniqueness check: Loop-increment until no collision
  - Settings storage key pattern: `${documentType}_prefix`, `${documentType}_next_number`
- **What to rewrite**:
  - Base44 entity queries → Drizzle ORM on Supabase `system_settings` table
  - Replace `base44.asServiceRole.entities.*.filter()` with Supabase queries
  - Consider moving to database sequence/trigger for better concurrency (PostgreSQL SERIAL)
- **Target location in spex**: `server/lib/documentNumbering.ts`
- **Effort**: 2-3h

### Import Parsers (Excel + Field Mapping)
- **Origin**: `/home/user/renobuild/functions/importLeads.ts`, `importClients.ts`, `importSuppliers.ts`, `importProjects.ts`, `importBudget.ts`
- **What it does**: XLSX parsing with Hebrew column header mapping, validation, duplicate detection, bulk create with auto-generated follow-up tasks.
- **What to keep**:
  - XLSX library: `npm:xlsx@0.18.5` (read, sheet_to_json)
  - Field mapping strategy: Object mapping Hebrew column names to entity field names; multiple variations per field (case-insensitive, plural/singular)
  - Column header fuzzy matching (importSuppliers.ts lines 108-115)
  - Duplicate detection logic: Check email + phone (normalized via regex `/\D/g`)
  - Required field validation (hard stop on missing required fields)
  - Bulk import loop pattern: Try/catch per row, collect errors + skipped, return summary
  - Auto-generated task creation post-import (CRMTodo with due_date offset)
- **What to rewrite**:
  - Remove Base44 SDK; use Supabase + Drizzle
  - Replace `formData.get('file')` with Fastify multipart handler
  - File validation: Check MIME type + file size
  - Duplicate detection: Move to pre-import query (more efficient)
  - Bulk create: Use Drizzle batch inserts instead of loop
  - Task generation: Consider optional flag (templates handle auto-tasks differently per entity type)
- **Target location in spex**: `server/routes/imports/` (leads, clients, suppliers, projects, budgets)
- **Effort**: 8-10h (field mapping per entity + Fastify handlers + Drizzle integration)

### Notification Service Template Catalog
- **Origin**: `/home/user/renobuild/src/services/NotificationService.js` (lines 13-126)
- **What it does**: Centralized notification template library with localized Hebrew messages, icons, priority levels, and WhatsApp/in-app channel templates.
- **What to keep**: Complete template catalog structure (preserve as prose/reference):
  - **Task Notifications** (8 templates):
    - task_assigned: "משימה חדשה הוקצתה אליך" → title, icon 📋, normal priority, message function, WhatsApp variant, deep link
    - task_completed: "משימה הושלמה" ✅
    - task_overdue: "משימה באיחור" ⚠️ (high priority)
    - task_due_soon: "משימה מתקרבת לתאריך היעד" ⏰
    - task_needs_fix: "משימה דורשת תיקון" 🔧 (high)
    - urgent_task_created: "משימה דחופה נוצרה" 🚨 (urgent)
  - **Project Notifications** (1 template):
    - all_tasks_completed: "כל המשימות הושלמו" 🎉
  - **Budget Notifications** (1 template):
    - budget_threshold: "התראת תקציב" 💰 (high), includes % usage, actual vs budget breakdown for WA
  - **Payment Notifications** (3 templates):
    - payment_approved: "בקשת תשלום אושרה" ✅ (normal)
    - payment_requested: "בקשת תשלום חדשה" 💳 (normal)
    - payment_paid: "תשלום בוצע" 💵 (low)
  - **General** (1 template):
    - mention: "אוזכרת בתגובה" @ (normal), includes comment preview
  - Each template has: title (Hebrew), icon (emoji), priority enum (urgent/high/normal/low), message(data) function, whatsapp(data) function, link(data) function
- **What to rewrite**: Everything else (service class, notification persistence, WhatsApp send logic) — templates are data; preserve as enum/JSON and reimplament in new NotificationService
- **Target location in spex**: `server/lib/notificationTemplates.ts` (enum-based catalog) + `server/services/NotificationService.ts` (new implementation)
- **Effort**: 2-3h (port template enum + write new service)

### Activity Log Service (Action/Entity Type Enums)
- **Origin**: `/home/user/renobuild/src/services/ActivityLogService.js` (lines 13-89)
- **What it does**: Audit trail schema with standardized action types, entity types, and Hebrew labels for display.
- **What to keep**:
  - ACTION_TYPES enum: CREATED, UPDATED, DELETED, RESTORED, STATUS_CHANGED, ARCHIVED, UNARCHIVED, TASK_ASSIGNED, TASK_COMPLETED, PAYMENT_APPROVED, PAYMENT_PAID, FILE_UPLOADED, COMMENT_ADDED, etc.
  - ENTITY_TYPES enum: PROJECT, TASK, PAYMENT, PAYMENT_REQUEST, USER, CLIENT, SUPPLIER, BUDGET, ORDER, DOCUMENT, COMMENT
  - Hebrew labels for both enums (ACTION_LABELS, ENTITY_LABELS) — use for audit trail UI
- **What to rewrite**: Service logic (integration with Base44) — enums are reusable as-is
- **Target location in spex**: `server/lib/auditTrailTypes.ts` (enum exports)
- **Effort**: 1-2h

### Calculation Service (Payment & Budget Math)
- **Origin**: `/home/user/renobuild/src/services/CalculationService.js`
- **What it does**: Centralized formulas for budget usage, payment totals, task progress — ensures consistency across frontend/backend.
- **What to keep**: All methods (calculateActualCosts, calculatePendingPayments, calculateApprovedPayments, calculateBudgetUsage, calculateBudgetVariance, calculateTaskProgress) — pure functions with no Base44 dependency
- **What to rewrite**: None — lift as-is; only import paths change
- **Target location in spex**: `packages/calculations/` (shared monorepo package) or `server/lib/calculations.ts`
- **Effort**: 1h (copy + test)

### Status Value Constants
- **Origin**: `/home/user/renobuild/src/constants/statusValues.js`
- **What it does**: Enumeration of all status values (task, payment, project, priority, order, work area) with color classes for Tailwind UI.
- **What to keep**: All enum objects + OPTIONS arrays (for dropdowns) + color helper functions (getStatusColorClasses, getWorkAreaColorClasses)
- **What to rewrite**: Tailwind class names if you switch CSS frameworks; otherwise lift as-is
- **Target location in spex**: `packages/constants/src/statuses.ts` (monorepo package)
- **Effort**: 1h

### Facebook Lead Ads Webhook
- **Origin**: `/home/user/renobuild/functions/facebookLeadWebhook.ts`
- **What it does**: Webhook endpoint that parses flexible Facebook Lead Ads payloads (via Make.com), creates or updates leads, auto-detects & maps budget range and timeline, sends welcome WhatsApp to new lead, logs as CRM interaction.
- **What to keep**:
  - Flexible field detection function `findField(data, possibleNames)` (lines 10-24) — supports case-insensitive, Hebrew/English variations
  - Budget range mapping (normalization of FB values to local buckets: "עד 200,000 ₪", "200,000-500,000 ₪", etc.)
  - Timeline mapping (same normalization: "מיידי - עד חודש", "תוך 1-3 חודשים", etc.)
  - Default owner assignment: `office@rnvt.co.il` (configurable)
  - Duplicate detection by email (prevents re-creating existing lead)
  - Lead creation with source tracking: `source: "פייסבוק"`, `source_details: "מודעה: ${ad_name} | קמפיין: ${campaign_name} | טופס: ${form_name}"`
  - Auto-greeting template lookup by name ("ברכת תחילת שיתוף") + auto-send to new lead
  - Notification creation for owner (type: "CRM", priority: "דחופה")
  - Debug logging pattern (emojis + structured console.log for troubleshooting)
- **What to rewrite**:
  - Remove Base44 SDK; use Supabase + Fastify
  - Replace Make.com webhook with direct Fastify route (or use Make's native Supabase integration if available)
  - Update send functions to new WhatsApp client
  - Update notification flow to new NotificationService
- **Target location in spex**: `server/routes/webhooks/facebook-leads.ts`, `server/lib/leadMappings.ts`
- **Effort**: 6-8h

---

## 2. Pattern-only (inspiration, not code)

### PDF Report Generators (Multi-page Layout)
- **Origin**: `generateCRMReportPDF.ts`, `generateForecastReportPDF.ts`, `generateTasksReportPDF.ts`, `generateSuppliersReportPDF.ts`
- **Pattern worth keeping**:
  - Multi-section reports with auto-pagination (check yPos against pageHeight, addPage when needed)
  - Striped table styling for data tables vs. plain tables for metadata
  - Summary statistics section (total values, averages, percentages in large bold font)
  - Interaction/history tables: truncate to last N items (e.g., 15 interactions)
  - Date range filtering (for report period)
- **Why rewrite rather than lift**: Each report has different data shapes (CRM vs. Forecast vs. Tasks); boilerplate extraction via base class is faster than refactoring 4 similar files
- **Target location**: `packages/pdf-hebrew/PDFReportGenerator.ts`

### Excel Export Generators
- **Origin**: `generateCRMReportExcel.ts`, `generateForecastReportExcel.ts`, `generateTasksReportExcel.ts`, `generateSuppliersReportExcel.ts`
- **Pattern worth keeping**:
  - XLSX workbook setup, sheet creation, styled headers (bold, background color), number formatting (currency)
  - Merge cells for titles, freeze panes for column headers
  - Data export loop with type conversion (dates, money)
- **Why rewrite rather than lift**: Use modern `xlsx` v0.18.5 or consider `exceljs` for better styling; new patterns may differ
- **Target location**: `packages/excel-export/`

### Lead/Client/Supplier Import with Duplicates
- **Origin**: Shared pattern across importLeads, importClients, importSuppliers
- **Pattern worth keeping**: Duplicate detection via email + phone (normalized), pre-filtering, summary report generation (created count, skipped, error details)
- **Why rewrite rather than lift**: Generics/generalize entity type at call time; parameterized schema validation
- **Target location**: `server/lib/importHelpers.ts`

---

## 3. Notification & template catalog (special)

### Notification Templates from NotificationService.js

#### Task Notifications
1. **task_assigned** — "משימה חדשה הוקצתה אליך" | 📋 | normal | *משימה חדשה* 📋 / "${taskTitle}" / מוקצה ע"י: ${assignedBy} / תאריך יעד: ${dueDate}
2. **task_completed** — "משימה הושלמה" | ✅ | low | *משימה הושלמה* ✅ / "${taskTitle}" / הושלמה ע"י: ${completedBy}
3. **task_overdue** — "משימה באיחור" | ⚠️ | high | *התראה: משימה באיחור* ⚠️ / "${taskTitle}" / בחיחור של ${daysOverdue} ימים
4. **task_due_soon** — "משימה מתקרבת לתאריך היעד" | ⏰ | normal | *תזכורת* ⏰ / "${taskTitle}" / נותרו ${daysUntilDue} ימים
5. **task_needs_fix** — "משימה דורשת תיקון" | 🔧 | high | *נדרש תיקון* 🔧 / "${taskTitle}" / דווח ע"י: ${reportedBy}
6. **urgent_task_created** — "משימה דחופה נוצרה" | 🚨 | urgent | *משימה דחופה* 🚨 / "${taskTitle}" / פרויקט: ${projectName}

#### Project Notifications
7. **all_tasks_completed** — "כל המשימות הושלמו" | 🎉 | normal | *הושלם!* 🎉 / כל ${totalTasks} משימות בפרויקט "${projectName}" הושלמו

#### Budget Notifications
8. **budget_threshold** — "התראת תקציב" | 💰 | high | *התראת תקציב* 💰 / פרויקט: ${projectName} / ניצול: ${currentUsage}% / תקציב: ₪${budget} / בפועל: ₪${actualCosts}

#### Payment Notifications
9. **payment_approved** — "בקשת תשלום אושרה" | ✅ | normal | *תשלום אושר* ✅ / סכום: ₪${amount} / ספק: ${supplier} / מאשר: ${approvedBy}
10. **payment_requested** — "בקשת תשלום חדשה" | 💳 | normal | *בקשת תשלום חדשה* 💳 / סכום: ₪${amount} / ספק: ${supplier} / מבקש: ${requestedBy}
11. **payment_paid** — "תשלום בוצע" | 💵 | low | *תשלום בוצע* 💵 / סכום: ₪${amount} / ספק: ${supplier}

#### General
12. **mention** — "אוזכרת בתגובה" | @ | normal | *אזכור* @ / ${mentionedBy} הזכיר אותך / "${commentPreview}"

**Implementation notes:**
- Priority order (for sorting): urgent=4, high=3, normal=2, low=1
- Each template supports in-app + WhatsApp channels (WhatsApp version is more compact with emoji separators)
- Deep links for in-app navigation (e.g., `/Tasks?taskId=${taskId}`, `/ProjectDetails?id=${projectId}`)
- Email channel support TBD (templates map to email body, subject, etc.)

---

## 4. Skip entirely

### All Base44 SDK-coupled code (non-utility)
- `base44.auth.me()`, `base44.entities.*.create()`, `.filter()`, `.update()`, `base44.asServiceRole` throughout
- Reason: Full replacement by Supabase + Drizzle; no pattern value

### /src/anycrm/ subtree
- Drop (legacy CRM UI being rewritten)

### PF (Project Financials) components
- `/src/components/pf/`, `PFDashboard.jsx`, `PFProjects.jsx`, `PFQuoteForm.jsx`, `PFSupplierView.jsx`, `PFReports.jsx`, `PFProjectAutomation.ts`, `createPFTemplates.ts`, `pfProjectAutomation.ts`
- Reason: Legacy workflows; new Spex has different financial UX

### Automation & reminder functions
- `aiOptimalFollowupTime.ts`, `dynamicReminders.ts`, `checkColdLeads.ts`, `checkInactiveLeads.ts`, `checkOverdueTasks.ts`, `checkPaymentReminders.ts`, `checkPendingPayments.ts`, `autoCreateCRMTasks.ts`, `smartCRMAlerts.ts`, `createLeadFollowupTask.ts`, `aiCRMAutomation.ts`, `scheduledAutomations.ts`
- Reason: Heavy Base44 coupling; logic is domain-specific but implementation is not reusable without full rewrite

### Conversion/Decision Logic
- `convertQuoteToOrder.ts`, `processQuoteDecision.ts`, `handleQuoteSelection.ts`
- Reason: Base44 entity operations; domain logic only (quote → order) survives, not code

### Legacy template generators
- `generateLeadTemplate.ts`, `generateClientTemplate.ts`, `generateSupplierTemplate.ts`, `generateProjectTemplate.ts`, `generateBudgetTemplate.ts`
- Reason: Base44-specific; templates are data, not code

### Expense webhook
- `processExpenseWebhook.ts`
- Reason: Deno-specific, minimal reusable logic

### CRM Reports (Excel/PDF)
- Query logic tied to Base44; tables/formatting patterns worth consulting (see Pattern-only section)

### _reference/ folder
- Explicitly excluded per scope

### Plan & audit docs
- All obsolete planning documents

---

## 5. Open questions

1. **PDF Font Strategy**: Should Spex continue using Rubik from GitHub CDN, or embed font in build? (CDN = simpler, embedded = faster, offline-safe)

2. **WhatsApp API Evolution**: Green API is used in old codebase. Should Spex stick with Green API or migrate to native WhatsApp Business API? (Green API = simpler, native = more control/cheaper at scale)

3. **Excel Import**: Should we build a UI template editor (advanced), or just document the expected column headers in a help guide?

4. **Notification Channels**: Old code supports in-app + WhatsApp + email (template stubs). Spex MVP: which channels first? (Recommend: in-app + WA, defer email)

5. **Import Batch Size**: Old code loops row-by-row (slow for 1000+ rows). Spex should use Drizzle batch inserts. What's the target batch size? (Recommend: 50-100 rows per batch)

6. **Activity Log Integration**: Should audit trail be mandatory for all CRUD, or opt-in per entity type? (Recommend: mandatory for payments/contracts, opt-in for others to avoid noise)
