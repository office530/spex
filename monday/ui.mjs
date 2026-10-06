// UI layer for the spec-v2 boards: column order by usability, working views, dashboards (§12).
// Source of truth for what was built through the monday API (views / dashboards) and for the manual parts
// (main-table drag order, which also drives the Item Card order — no API exists for column position).
//
// Column order rule (every board):  identify → state → who → when → how much → context → details → derived
// → technical. Technical columns (rec_id, int_status, created, int_key) are hidden in working views.

export const TECH = ['rec_id', 'int_status', 'created', 'int_key'];
const HAS_INT_STATUS = ['vendors', 'leads', 'budget', 'orders', 'vinvoices', 'billing'];
export const techFor = (key) => TECH.filter((t) => t !== 'int_status' || HAS_INT_STATUS.includes(key));

// Main-table order per board (manual drag in the UI; the Item Card follows it).
export const mainOrder = {
  clients: ['name', 'company_type', 'city', 'phone', 'email', 'board_relation_mm7sy0he', 'board_relation_mm7stdzs', 'board_relation_mm7sr94h', 'referrals', 'tax_id', 'morning_id'],
  contacts: ['name', 'company', 'role', 'phone', 'email', 'wa_consent', 'consent_date'],
  vendors: ['name', 'vendor_type', 'trade', 'compliance', 'pay_block', 'days_to_expiry', 'phone', 'email', 'insurance_exp', 'wht_exp', 'books_exp', 'manpower_exp', 'last_rating', 'framework_exp', 'pricelist', 'board_relation_mm7sdrk7', 'bank_status', 'bank_callback', 'tax_id', 'vendor_code'],
  leads: ['name', 'stage', 'owner', 'company', 'contact', 'expected_value', 'probability', 'weighted', 'quote_date', 'tender_due', 'approval', 'price', 'margin', 'discount', 'approval_tier', 'min_margin', 'decision', 'score', 's_niche', 's_class', 's_credit', 's_designer', 's_schedule', 's_competition', 's_repeat', 's_team', 'lead_type', 'source', 'tender_q', 'days_to_quote', 'quote_link', 'win_loss', 'competitor_price', 'project'],
  projects: ['name', 'project_code', 'phase', 'client', 'pm', 'site_mgr', 'timeline', 'contract_value', 'approved_changes', 'unapproved_changes', 'open_defects', 'missing_journals', 'forecast_margin', 'eac', 'actual_cost', 'earned_revenue', 'over_under', 'as_of_close', 'fin_freshness', 'on_time', 'nps', 'address', 'drive_folder', 'board_relation_mm7s6nn0'],
  changes: ['name', 'project', 'change_type', 'status', 'owner', 'amount', 'cost', 'budget_line', 'executed', 'identified', 'submitted', 'days_to_submit', 'urgent_date', 'written_due', 'approval_file', 'urgent_link', 'schedule_impact', 'pricing_method', 'sub_tier', 'billed_in', 'change_code'],
  journals: ['name', 'project', 'date', 'submitter', 'work_done', 'issues', 'weather', 'photos', 'photos_link', 'ai_summary', 'subtasks_mm7sa5w0'],
  defects: ['name', 'project', 'severity', 'status', 'sub', 'owner', 'due', 'location', 'photo_before', 'photo_after'],
  safety: ['name', 'project', 'rec_type', 'date', 'finding_status', 'severity', 'close_due', 'close_overdue', 'performer', 'participants', 'notice_due', 'notice_ref', 'training_log', 'files'],
  budget: ['name', 'project', 'cost_code', 'chapter', 'cost_type', 'orig_budget', 'approved_changes', 'revised', 'commitments', 'remaining', 'utilization', 'budget_status', 'board_relation_mm7sk241', 'board_relation_mm7sx2be'],
  orders: ['name', 'project', 'vendor', 'amount', 'status', 'approval', 'approval_tier', 'in_budget', 'budget_line', 'requester', 'planned_delivery', 'actual_delivery', 'three_quotes', 'framework_price', 'vendor_compliance', 'po_code', 'pdf', 'delivery_note', 'board_relation_mm7s4f44'],
  vinvoices: ['name', 'vendor', 'project', 'po', 'invoice_no', 'net_amount', 'to_pay', 'three_way', 'pay_approval', 'second_approval', 'ready', 'vendor_block', 'allocation_no', 'alloc_required', 'cum_approved', 'retention', 'paid_date', 'paid_by', 'file'],
  billing: ['name', 'project', 'bill_status', 'approved_amt', 'balance', 'due', 'days_late', 'collection', 'to_bill', 'submitted', 'approved_date', 'days_to_approve', 'doc_type', 'doc_no', 'allocation_no', 'pdf', 'paid', 'cum_qty', 'cum_changes', 'prev_bills', 'retention_pct', 'board_relation_mm7s8keg', 'bill_code'],
  guarantees: ['name', 'project', 'g_type', 'amount', 'expiry', 'status', 'issuer', 'file'],
  tasks: ['name', 'status', 'owner', 'due', 'priority', 'domain', 'task_type', 'project', 'requester', 'waiting_for', 'followup', 'meeting_type', 'template', 'decision_helper'],
  renewals: ['name', 'r_type', 'expiry', 'renewal_status', 'owner', 'annual_cost', 'counterparty', 'drive'],
  sensitive: ['name', 'status', 'owner', 'due', 'priority', 'domain', 'task_type', 'project', 'requester', 'waiting_for', 'followup', 'meeting_type', 'template', 'decision_helper'],
  snapshot: ['name', 'low_balance', 'deficit_weeks', 'first_deficit', 'backlog', 'portfolio_margin', 'dso', 'quote_cycle', 'on_time_pct'],
  intlog: ['name', 'scenario', 'result', 'run_time', 'error', 'handled', 'handler', 'source_board', 'source_item', 'version'],
};

// Status label ids (filters take label ids; conditional coloring takes label text).
const ME = 'person-12547623'; // CEO (Shay)

// Working views (create_view_table). id = live view id; show = visible columns in this order; everything else hidden.
export const views = {
  projects: [
    { id: '284394446', name: 'פורטפוליו פעיל', show: ['name', 'project_code', 'phase', 'client', 'pm', 'site_mgr', 'timeline', 'contract_value', 'approved_changes', 'unapproved_changes', 'open_defects', 'missing_journals', 'fin_freshness'],
      filter: [['phase', 'any_of', [7, 4, 3, 8]]], floating: 2,
      color: [['unapproved_changes', 'GREATER_THAN', ['0'], 'orange', false], ['missing_journals', 'GREATER_THAN', ['2'], 'stuck-red', false], ['open_defects', 'GREATER_THAN', ['0'], 'egg_yolk', false]] },
    { id: '284394464', name: 'כספי — מנכ״ל', show: ['name', 'project_code', 'phase', 'contract_value', 'approved_changes', 'actual_cost', 'eac', 'forecast_margin', 'earned_revenue', 'over_under', 'as_of_close', 'fin_freshness'],
      filter: [['phase', 'not_any_of', [17]]], floating: 2, color: [['forecast_margin', 'LOWER_THAN', ['10'], 'stuck-red', false]] },
  ],
  leads: [
    { id: '284394467', name: 'צנרת פעילה', show: ['name', 'stage', 'owner', 'company', 'expected_value', 'probability', 'weighted', 'quote_date', 'tender_due', 'approval'],
      filter: [['stage', 'not_any_of', [1, 2, 6, 10]]], groupBy: 'stage', sort: [['expected_value', 'desc']], floating: 2 },
    { id: '284394478', name: 'Go/No-Go', show: ['name', 'owner', 'company', 's_niche', 's_class', 's_credit', 's_designer', 's_schedule', 's_competition', 's_repeat', 's_team', 'score', 'decision'],
      filter: [['stage', 'any_of', [3]]], color: [['decision', 'CONTAINS_TEXT', ['No-Go'], 'stuck-red', true]] }, // rating columns can't drive coloring via API
    { id: '284394473', name: 'הצעות לאישור', show: ['name', 'owner', 'company', 'price', 'margin', 'min_margin', 'discount', 'approval_tier', 'approval', 'quote_link'],
      filter: [['approval', 'any_of', [0, 2, 13]]] },
  ],
  budget: [
    { id: '284394474', name: 'חריגות ו-90%', show: ['name', 'project', 'cost_code', 'orig_budget', 'approved_changes', 'revised', 'commitments', 'remaining', 'utilization', 'budget_status'],
      filter: [['budget_status', 'any_of', [2, 0]]], color: [['budget_status', 'ANY_OF', ['חריגה'], 'stuck-red', true], ['budget_status', 'ANY_OF', ['מעל 90%'], 'orange', true]] },
  ],
  orders: [
    { id: '284394475', name: 'ממתין לאישור', show: ['name', 'project', 'vendor', 'amount', 'approval', 'approval_tier', 'in_budget', 'requester'],
      filter: [['approval', 'any_of', [7, 0, 2]]], sort: [['amount', 'desc']] },
    { id: '284394491', name: 'אספקות באיחור', show: ['name', 'project', 'vendor', 'amount', 'status', 'planned_delivery', 'requester'],
      filter: [['planned_delivery', 'lower_than', ['TODAY']], ['actual_delivery', 'is_empty', []], ['status', 'any_of', [1, 6, 19]]], sort: [['planned_delivery', 'asc']] },
  ],
  vinvoices: [
    { id: '284394493', name: 'לאישור תשלום', show: ['name', 'vendor', 'project', 'net_amount', 'to_pay', 'three_way', 'pay_approval', 'second_approval', 'ready', 'vendor_block', 'allocation_no'],
      filter: [['pay_approval', 'any_of', [0, 11]], ['second_approval', 'any_of', [0]]], or: true },
    { id: '284394494', name: 'בעיות התאמה', show: ['name', 'vendor', 'project', 'po', 'invoice_no', 'net_amount', 'three_way', 'allocation_no', 'alloc_required'],
      filter: [['three_way', 'any_of', [2, 11, 12, 13, 17]]], color: [['three_way', 'ANY_OF', ['פער כמות', 'פער מחיר', 'ללא מספר הקצאה', 'ללא הזמנה'], 'stuck-red', true]] },
  ],
  billing: [
    { id: '284394495', name: 'גבייה פתוחה', show: ['name', 'project', 'bill_status', 'approved_amt', 'balance', 'due', 'days_late', 'collection', 'doc_no'],
      filter: [['bill_status', 'not_any_of', [15, 17]]], sort: [['due', 'asc']],
      color: [['collection', 'ANY_OF', ['45 עו״ד', '30 מכתב מנכ״ל'], 'stuck-red', true], ['collection', 'ANY_OF', ['21 שיחת סמנכ״ל', '14 שיחת PM'], 'orange', true]] },
    { id: '284394496', name: 'אצל מפקח', show: ['name', 'project', 'bill_status', 'to_bill', 'submitted', 'days_to_approve', 'approved_amt'],
      filter: [['bill_status', 'any_of', [0, 2]]], sort: [['submitted', 'asc']] },
  ],
  vendors: [
    { id: '284394500', name: 'ציות לא תקין', show: ['name', 'vendor_type', 'compliance', 'pay_block', 'days_to_expiry', 'insurance_exp', 'wht_exp', 'books_exp', 'manpower_exp', 'phone', 'email'],
      filter: [['compliance', 'any_of', [0, 2, 11, 13]]], // formula columns can't be a view sort key
      color: [['compliance', 'ANY_OF', ['פג תוקף', 'חסר'], 'stuck-red', true], ['compliance', 'ANY_OF', ['פג בעוד 7'], 'orange', true]] },
    { id: '284394515', name: 'פרטי בנק לאימות', show: ['name', 'vendor_type', 'bank_status', 'bank_callback', 'phone'], filter: [['bank_status', 'any_of', [2, 0]]] },
  ],
  changes: [
    { id: '284394516', name: 'פתוחים', show: ['name', 'project', 'change_type', 'status', 'owner', 'amount', 'cost', 'identified', 'days_to_submit', 'executed', 'written_due'],
      filter: [['status', 'any_of', [17, 0, 9, 11]]], groupBy: 'status', color: [['status', 'ANY_OF', ['בוצע ללא אישור'], 'stuck-red', true]] },
    { id: '284394517', name: 'אושר — טרם חויב', show: ['name', 'project', 'amount', 'status', 'billed_in'],
      filter: [['status', 'any_of', [1]], ['change_type', 'any_of', [7]], ['billed_in', 'is_empty', []]] },
  ],
  defects: [
    { id: '284394518', name: 'פתוחים', show: ['name', 'project', 'severity', 'status', 'sub', 'owner', 'due', 'location'],
      filter: [['status', 'any_of', [2, 0]]], sort: [['due', 'asc']], color: [['severity', 'ANY_OF', ['קריטי'], 'stuck-red', true]] },
  ],
  safety: [
    { id: '284394521', name: 'ממצאים פתוחים', show: ['name', 'project', 'severity', 'finding_status', 'close_due', 'close_overdue', 'performer'],
      filter: [['finding_status', 'any_of', [2, 0, 11]]], sort: [['close_due', 'asc']], color: [['finding_status', 'ANY_OF', ['הוסלם'], 'stuck-red', true]] },
    { id: '284394524', name: 'הודעות נדרשות', show: ['name', 'project', 'notice_due', 'notice_ref', 'performer'], filter: [['rec_type', 'any_of', [9]], ['notice_ref', 'is_empty', []]] },
  ],
  tasks: [
    { id: '284394540', name: 'ממתין להחלטת מנכ״ל', show: ['name', 'requester', 'domain', 'project', 'decision_helper', 'due', 'priority'],
      filter: [['status', 'any_of', [2]], ['owner', 'any_of', [ME]]], sort: [['decision_helper', 'asc']] },
    { id: '284394541', name: 'באיחור', show: ['name', 'status', 'owner', 'due', 'priority', 'domain', 'project'],
      filter: [['due', 'any_of', ['OVERDUE']]], groupBy: 'owner', sort: [['due', 'asc']] },
  ],
  renewals: [
    { id: '284394542', name: 'פג עד סוף החודש הבא', show: ['name', 'r_type', 'expiry', 'renewal_status', 'owner', 'annual_cost'],
      filter: [['expiry', 'lower_than_or_equal', ['ONE_MONTH_FROM_NOW']], ['renewal_status', 'not_any_of', [6, 17]]], sort: [['expiry', 'asc']] },
  ],
  guarantees: [
    { id: '284394544', name: 'לחידוש', show: ['name', 'project', 'g_type', 'amount', 'expiry', 'status', 'issuer'], filter: [['status', 'any_of', [0]]], sort: [['expiry', 'asc']] },
  ],
  intlog: [
    { id: '284394545', name: 'נכשל ולא טופל', show: ['name', 'scenario', 'result', 'run_time', 'error', 'handled', 'handler', 'source_board', 'source_item'],
      filter: [['result', 'any_of', [2, 11]], ['handled', 'is_empty', []]], sort: [['run_time', 'desc']] },
  ],
};

// Dashboards per spec §12 (create_dashboard + create_widget). Journals and intlog are excluded (Pro: 20 boards /
// 20k items per dashboard). Widget filters (e.g. "only ממתין להחלטה") have no API — charts show the full status
// split; narrowing a widget is a UI step (see UI.md). [kind, name, id, board → column(s)]
export const dashboards = [
  { id: '39820634', name: 'מנכ״ל — חריגים קודם', ws: 'w50', kind: 'PRIVATE', boards: ['tasks', 'renewals', 'guarantees', 'changes', 'billing', 'projects', 'leads'],
    widgets: [
      ['CHART', 'משימות לפי אחראי וסטטוס', '723764384', 'tasks: owner × status'],
      ['NUMBER', 'שינויים לא מאושרים (₪)', '723764395', 'projects: Σ unapproved_changes'],
      ['NUMBER', 'יתרת חייבים (₪)', '723764404', 'billing: Σ balance'],
      ['CHART', 'משימות לפי סטטוס (ממתין להחלטה)', '723764454', 'tasks: status'],
      ['CALENDAR', 'פקיעות — חידושים וערבויות', '723764476', 'renewals.expiry + guarantees.expiry'],
      ['CHART', 'שינויים לפי סטטוס (בוצע ללא אישור)', '723764490', 'changes: status'],
      ['CHART', 'סולם גבייה — יתרה לפי שלב', '723764512', 'billing: collection → Σ balance'],
      ['CHART', 'פרויקטים לפי שלב', '723764525', 'projects: phase'],
      ['NUMBER', 'רווח צפוי — פורטפוליו (₪)', '723764526', 'projects: Σ forecast_margin'],
      ['NUMBER', 'צפי עלות לסיום — EAC (₪)', '723764527', 'projects: Σ eac'],
      ['NUMBER', 'ערך חוזים — צבר (₪)', '723764528', 'projects: Σ contract_value'],
      ['NUMBER', 'צנרת משוקללת (₪)', '723764529', 'leads: Σ weighted'],
    ] },
  { id: '39820635', name: 'סמנכ״ל — תפעול וכספים', ws: 'w50', kind: 'PRIVATE', boards: ['orders', 'vinvoices', 'leads', 'budget', 'vendors', 'projects'],
    widgets: [
      ['CHART', 'הזמנות לפי שלב אישור', '723764530', 'orders: approval'],
      ['CHART', 'הצעות מחיר לפי שלב אישור', '723764531', 'leads: approval'],
      ['CHART', 'חשבונות ספקים — אישור תשלום', '723764532', 'vinvoices: pay_approval'],
      ['CHART', 'התאמה משולשת', '723764533', 'vinvoices: three_way'],
      ['CHART', 'שורות תקציב לפי מצב', '723764537', 'budget: budget_status'],
      ['CHART', 'ציות ספקים', '723764543', 'vendors: compliance'],
      ['CHART', 'פרטי בנק — אימות', '723764544', 'vendors: bank_status'],
      ['NUMBER', 'חיוב יתר / חסר (₪)', '723764547', 'projects: Σ over_under'],
      ['NUMBER', 'הכנסה שהורווחה (₪)', '723764549', 'projects: Σ earned_revenue'],
      ['NUMBER', 'התחייבויות מול תקציב (₪)', '723764551', 'budget: Σ commitments'],
    ] },
  { id: '39820636', name: 'ביצוע, איכות ובטיחות', ws: 'w20', kind: 'PUBLIC', boards: ['defects', 'safety', 'projects'],
    widgets: [
      ['CHART', 'ליקויים לפי סטטוס וחומרה', '723764561', 'defects: status × severity'],
      ['CHART', 'ליקויים לפי אחראי', '723764562', 'defects: owner × status'],
      ['CHART', 'ממצאי בטיחות לפי סטטוס', '723764563', 'safety: finding_status'],
      ['CHART', 'רשומות בטיחות לפי שבוע וסוג (סיורים)', '723764564', 'safety: date/week × rec_type'],
      ['NUMBER', 'ליקויים פתוחים (כל הפרויקטים)', '723764565', 'projects: Σ open_defects'],
      ['NUMBER', 'יומני עבודה חסרים', '723764566', 'projects: Σ missing_journals'],
    ] },
  { id: '39820637', name: 'מכירות', ws: 'w10', kind: 'PUBLIC', boards: ['leads'],
    widgets: [
      ['CHART', 'משפך לידים לפי שלב', '723764567', 'leads: stage'],
      ['CHART', 'צנרת משוקללת לפי שלב (₪)', '723764568', 'leads: stage → Σ weighted'],
      ['NUMBER', 'צנרת משוקללת (₪)', '723764569', 'leads: Σ weighted'],
      ['NUMBER', 'ממוצע ימים מליד להצעה', '723764570', 'leads: avg days_to_quote'],
      ['CHART', 'לידים לפי מקור', '723764571', 'leads: source'],
      ['CHART', 'לידים לפי אחראי ושלב', '723764572', 'leads: owner × stage'],
      ['BATTERY', 'שיעור סגירה (חוזה נחתם)', '723764573', 'leads: stage, done = חוזה נחתם'],
    ] },
  { id: '39820638', name: 'רכש וקבלני משנה', ws: 'w30', kind: 'PUBLIC', boards: ['orders', 'vendors'],
    widgets: [
      ['CHART', 'הזמנות לפי סטטוס', '723764575', 'orders: status'],
      ['CHART', 'הזמנות ממתינות — שווי לפי שלב אישור (₪)', '723764576', 'orders: approval → Σ amount'],
      ['CALENDAR', 'לוח אספקות מתוכננות', '723764582', 'orders.planned_delivery, color = status'],
      ['CHART', 'ציות ספקים', '723764586', 'vendors: compliance'],
      ['CHART', 'ספקים לפי סוג', '723764587', 'vendors: vendor_type'],
      ['NUMBER', 'דירוג ספקים ממוצע', '723764588', 'vendors: avg last_rating'],
    ] },
  { id: '39820639', name: 'גבייה ומזומנים', ws: 'w30', kind: 'PRIVATE', boards: ['billing'],
    widgets: [
      ['CHART', 'סולם גבייה — יתרה לפי שלב (₪)', '723764599', 'billing: collection → Σ balance'],
      ['CHART', 'חשבונות לפי סטטוס', '723764600', 'billing: bill_status'],
      ['NUMBER', 'יתרה לגבייה (₪)', '723764609', 'billing: Σ balance'],
      ['NUMBER', 'אושר ע״י מפקח (₪)', '723764610', 'billing: Σ approved_amt'],
      ['NUMBER', 'נגבה (₪)', '723764611', 'billing: Σ paid'],
      ['NUMBER', 'ממוצע ימי איחור', '723764615', 'billing: avg days_late'],
      ['NUMBER', 'ממוצע ימים לאישור מפקח', '723764616', 'billing: avg days_to_approve'],
      ['CALENDAR', 'מועדי תשלום צפויים', '723764617', 'billing.due, color = collection'],
    ] },
  { id: '39820640', name: 'מנהלי פרויקטים', ws: 'w20', kind: 'PUBLIC', boards: ['projects', 'tasks', 'defects', 'changes'],
    widgets: [
      ['GANTT', 'ציר זמן פרויקטים', '723764620', 'projects.timeline, color = phase'],
      ['CHART', 'משימות לפי אחראי וסטטוס', '723764622', 'tasks: owner × status'],
      ['CHART', 'ליקויים לפי אחראי וסטטוס', '723764623', 'defects: owner × status'],
      ['CHART', 'שינויים לפי אחראי וסטטוס', '723764624', 'changes: owner × status'],
      ['CHART', 'יומנים חסרים לפי מנהל פרויקט', '723764625', 'projects: pm → Σ missing_journals'],
    ] },
];

// In-board widget tabs (create_view type DASHBOARD + create_widget parent BOARD_VIEW) for the §5 views the API can
// express. Kanban, cards and map views have no create API — UI only (UI.md).
export const boardTabs = [
  { board: 'projects', id: '284394607', name: 'גאנט', widgets: [['GANTT', 'גאנט לפי ציר זמן', '723764642', 'timeline, group = group, color = phase']] },
  { board: 'tasks', id: '284394608', name: 'לוח שנה', widgets: [['CALENDAR', 'לוח שנה — יעד ומעקב', '723764643', 'due + followup, color = status']] },
  { board: 'leads', id: '284394609', name: 'צפי משוקלל', widgets: [['CHART', 'צפי משוקלל לפי שלב (₪)', '723764644', 'stage → Σ weighted'], ['NUMBER', 'סה״כ צפי משוקלל (₪)', '723764645', 'Σ weighted']] },
];

// Turn a view spec into create_view_table arguments.
export function viewArgs(boardKey, boardId, v) {
  const order = [...v.show, ...mainOrder[boardKey].filter((c) => !v.show.includes(c)), ...techFor(boardKey)];
  return {
    boardId: String(boardId), name: v.name,
    filter: v.filter ? { operator: v.or ? 'or' : 'and', rules: v.filter.map(([column_id, operator, compare_value]) => ({ column_id, operator, compare_value })) } : undefined,
    sort: v.sort?.map(([column_id, direction]) => ({ column_id, direction })),
    settings: {
      columns: {
        column_order: order,
        column_properties: order.filter((c) => !v.show.includes(c)).map((column_id) => ({ column_id, visible: false })),
        ...(v.floating ? { floating_columns_count: v.floating } : {}),
      },
      ...(v.groupBy ? { group_by: { conditions: [{ columnId: v.groupBy }], hideEmptyGroups: true } } : {}),
      ...(v.color ? { conditional_coloring: v.color.map(([column_id, operator, value, color, entire_row]) => ({ column_id, operator, value, color, entire_row })) } : {}),
    },
  };
}

if (process.argv[2]) {
  const { boards } = JSON.parse(await (await import('node:fs/promises')).readFile(new URL('./manifest.json', import.meta.url), 'utf8'));
  const [key, i] = process.argv.slice(2);
  console.log(JSON.stringify(viewArgs(key, boards[key].id, views[key][Number(i || 0)])));
}
