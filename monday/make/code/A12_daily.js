// A12 — daily routines + date controls (05:30). One sweep replaces ~35 built-in automations that the basic monday
// builder can't express correctly (no "is not", no "column is empty", no owner taken from a people column):
//   A12 recurring routines (§7.2, §7.3) → items in "שגרות" with owner + due date
//   A14 renewal ≤60 days → task for the renewal owner · A15 renewal 14 days → owner + VP
//   §5.14 guarantee ≤30 days → status "לחידוש" + VP · §5.8 defect due today → owner, +2 days → site manager
//   A18 safety finding open 2 days past close date → "הוסלם" + site manager + VP · A19 notice due tomorrow → performer
//   A05 urgent change approval + 7 days without a written approval file → owner
//   A22 CEO decision queue → stamp helper date + notify, remind every 3 days; clear the stamp once decided
// Every create is keyed (int_key) and every status write moves the item out of the rule, so a re-run never duplicates.
// input: data = { keyed, decisions, helpers, renewals, guarantees, defects, findings, notices, urgent, projects }, today
const d = input.data || {};
const today = input.today || todayIL();
const mb = mutationBuilder();
const at = (iso) => new Date(`${iso}T12:00:00Z`);
const addDays = (iso, n) => new Date(at(iso).getTime() + n * 86400000).toISOString().slice(0, 10);
const dow = at(today).getUTCDay(); // 0 = Sunday
const dom = Number(today.slice(8, 10));
const month = Number(today.slice(5, 7));
const keys = new Set(pageItems(d, 'keyed').map((t) => cvText(t, 'int_key')));
const projects = new Map(pageItems(d, 'projects').map((p) => [Number(p.id), p]));
const projectOf = (item) => projects.get(relIds(item, 'project')[0]);
const firstPerson = (...pairs) => pairs.map(([item, col]) => (item ? personIds(item, col)[0] : 0)).find(Boolean) || C.users.vp;
const counts = { routines: 0, renewals: 0, guarantees: 0, defects: 0, safety: 0, changes: 0, decisions: 0 };
let n = 0;
const task = (name, { owner, domain, due, key, priority = 'רגיל', type = 'חד-פעמית', group = C.group.tasksWeek }) => {
  const cv = {
    task_type: { label: type }, domain: { labels: [domain] }, status: { label: 'חדש' }, priority: { label: priority },
    owner: { personsAndTeams: [{ id: owner, kind: 'person' }] }, due: { date: due }, int_key: key,
  };
  mb.op(`t${n++}: create_item(board_id: ${C.board.tasks}, group_id: "${group}", item_name: ${mb.v('String!', name)}, column_values: ${mb.v('JSON!', JSON.stringify(cv))}) { id }`);
};
const setCols = (board, id, cv) => mb.op(`w${n++}: change_multiple_column_values(board_id: ${board}, item_id: ${id}, column_values: ${mb.v('JSON!', JSON.stringify(cv))}) { id }`);
const tell = (users, itemId, text) => [...new Set(users.filter(Boolean))].forEach((u) => notify(mb, `n${n++}`, u, itemId, text));

// ── A12 routines (§7.2 office manager, §7.3 VP). when: daily = Sun–Thu; weekday 0 = Sunday; quarter = Jan/Apr/Jul/Oct.
const ROUTINES = [
  { id: 'OD', daily: true, who: 'office', domain: 'משרד', name: 'שגרה יומית: בקשות חדשות · קליטת חשבוניות ספק · תקבולים · יומני עבודה חסרים' },
  { id: 'OW', weekday: 0, who: 'office', domain: 'כספים', name: 'שגרה שבועית: סולם גבייה · ספקים שתוקפם פג בקרוב · רשימת תשלומים לאישור' },
  { id: 'OM1', monthDay: 1, dueDay: 5, who: 'office', domain: 'כספים', name: 'קליטה והתאמת הזמנות של החודש הקודם (עד ה-5)' },
  { id: 'OM2', monthDay: 1, dueDay: 10, who: 'office', domain: 'כספים', name: 'אישורי יתרה מקבלני משנה · העברה להנהלת החשבונות' },
  { id: 'OM3', monthDay: 18, dueDay: 25, who: 'office', domain: 'כספים', name: 'חשבונות חלקיים ללקוחות (עד ה-25)' },
  { id: 'OQ', quarterDay: 1, dueIn: 14, who: 'office', domain: 'ציות', name: 'שגרה רבעונית: איסוף דירוגי קבלני משנה · דגימת תלושים אצל קבלני כוח אדם' },
  { id: 'OY', yearDay: [12, 1], dueIn: 30, who: 'office', domain: 'ציות', name: 'שגרה שנתית: חידושים מהמרשם (רשם הקבלנים, רישיונות, הסמכות)' },
  { id: 'VD', daily: true, who: 'vp', domain: 'משרד', name: 'סמנכ״ל — שגרה יומית: אישורים ממתינים' },
  { id: 'VW', weekday: 0, who: 'vp', domain: 'משרד', name: 'סמנכ״ל — שגרה שבועית: ישיבת תפעול · סקירת תזרים עם הבקר · לוח משימות עם מנהלת המשרד · יומן אינטגרציות' },
  { id: 'VM', monthDay: 10, dueIn: 3, who: 'vp', domain: 'כספים', name: 'סמנכ״ל — שגרה חודשית: ישיבת כספים · סקירה כספית לכל פרויקט · מכסות monday/Make · יצוא חודשי' },
  { id: 'VQ', quarterDay: 1, dueIn: 14, who: 'vp', domain: 'משרד', name: 'סמנכ״ל — שגרה רבעונית: דירוג קבלני משנה · סקירת הרשאות · ניקוי לוחות ואוטומציות · תרגול חלופה ידנית' },
  { id: 'VY', yearDay: [11, 1], dueIn: 30, who: 'vp', domain: 'כספים', name: 'סמנכ״ל — שגרה שנתית: תקציב שנתי · היערכות לחידוש ביטוחים' },
];
const isDue = (r) => (r.daily && dow <= 4) || r.weekday === dow || r.monthDay === dom ||
  (r.quarterDay === dom && [1, 4, 7, 10].includes(month)) || (r.yearDay && r.yearDay[0] === month && r.yearDay[1] === dom);
ROUTINES.filter(isDue).forEach((r) => {
  const key = `A12:${r.id}:${today}`;
  if (keys.has(key)) return;
  const due = r.dueDay ? `${today.slice(0, 8)}${String(r.dueDay).padStart(2, '0')}` : r.dueIn ? addDays(today, r.dueIn) : today;
  task(r.name, { owner: r.who === 'vp' ? C.users.vp : C.users.office, domain: r.domain, due, key, type: 'שגרה חוזרת', group: C.group.tasksRoutine });
  counts.routines++;
});

// ── A14 / A15 renewals
const RENEWAL_DOMAIN = {
  'פוליסה': 'ביטוח', 'רשם הקבלנים': 'ציות', 'רכב-רישיון': 'רכבים', 'רכב-ביטוח': 'רכבים', 'רכב-טסט': 'רכבים', 'ליסינג': 'רכבים',
  'שכירות': 'משרד', 'מנוי תוכנה': 'מחשוב', 'דומיין/אתר': 'מחשוב', 'מסגרת בנקאית': 'כספים', 'הסמכת עובד': 'משאבי אנוש', 'ISO': 'ציות',
};
pageItems(d, 'renewals').forEach((r) => {
  const exp = cvText(r, 'expiry');
  if (!exp || ['חודש', 'לא לחדש'].includes(cvText(r, 'renewal_status'))) return;
  const left = daysBetween(today, exp);
  const owner = personIds(r, 'owner')[0] || C.users.office;
  const type = cvText(r, 'r_type').split(',')[0].trim();
  const key = `A14:${r.id}:${exp}`;
  if (left <= 60 && !keys.has(key)) {
    task(`חידוש: ${r.name}${type ? ` (${type})` : ''} — בתוקף עד ${exp}`, {
      owner, domain: RENEWAL_DOMAIN[type] || 'משרד', due: left > 30 ? addDays(exp, -30) : today, key, priority: left <= 14 ? 'דחוף' : 'גבוה',
    });
    counts.renewals++;
  }
  if (left === 14) { tell([owner, C.users.vp], r.id, `חידוש בעוד 14 יום ועדיין לא חודש: ${r.name} (${exp})`); counts.renewals++; }
});

// ── §5.14 guarantees / project insurance
pageItems(d, 'guarantees').forEach((g) => {
  const exp = cvText(g, 'expiry');
  if (!exp || cvText(g, 'status') !== 'בתוקף' || daysBetween(today, exp) > 30) return;
  setCols(C.board.guarantees, g.id, { status: { label: 'לחידוש' } });
  tell([C.users.vp], g.id, `${cvText(g, 'g_type') || 'ערבות'} "${g.name}" בתוקף עד ${exp} — לחדש או להשיב`);
  counts.guarantees++;
});

// ── §5.8 defects (fetched: פתוח / בטיפול only)
pageItems(d, 'defects').forEach((x) => {
  const due = cvText(x, 'due');
  if (!due) return;
  const late = daysBetween(due, today);
  const p = projectOf(x);
  if (late === 0) { tell([firstPerson([x, 'owner'], [p, 'pm'])], x.id, `ליקוי ליעד היום: ${x.name}`); counts.defects++; }
  if (late === 2) { tell([firstPerson([p, 'site_mgr'], [p, 'pm'])], x.id, `ליקוי באיחור של יומיים: ${x.name} (${cvText(x, 'status')})`); counts.defects++; }
});

// ── A18 safety findings (fetched: פתוח / בטיפול) · A19 regulator notices (fetched: הודעה נדרשת)
pageItems(d, 'findings').forEach((f) => {
  const due = cvText(f, 'close_due');
  if (!due || daysBetween(due, today) < 2) return;
  const p = projectOf(f);
  setCols(C.board.safety, f.id, { finding_status: { label: 'הוסלם' } });
  tell([firstPerson([p, 'site_mgr'], [p, 'pm']), C.users.vp], f.id, `ממצא בטיחות פתוח ${daysBetween(due, today)} ימים אחרי מועד הסגירה — הוסלם: ${f.name}`);
  counts.safety++;
});
pageItems(d, 'notices').forEach((s) => {
  const due = cvText(s, 'notice_due');
  if (!due || cvText(s, 'notice_ref') || daysBetween(today, due) !== 1) return;
  const p = projectOf(s);
  tell([firstPerson([s, 'performer'], [p, 'site_mgr'], [p, 'pm'])], s.id, `מחר המועד האחרון להודעה נדרשת ואין מספר אישור: ${s.name}`);
  counts.safety++;
});

// ── A05 urgent change approvals (fetched: תאריך אישור דחוף not empty)
pageItems(d, 'urgent').forEach((c) => {
  if (cvText(c, 'approval_file') || ['נדחה', 'חויב'].includes(cvText(c, 'status'))) return;
  if (daysBetween(cvText(c, 'urgent_date'), today) !== 7) return;
  tell([firstPerson([c, 'owner'], [projectOf(c), 'pm'])], c.id, `עברו 7 ימים מאישור דחוף ואין אישור בכתב: ${c.name}`);
  counts.changes++;
});

// ── A22 CEO decision queue (fetched: status ממתין להחלטה) + clear stale stamps (stamped but decided)
pageItems(d, 'decisions').forEach((t) => {
  if (!personIds(t, 'owner').includes(C.users.ceo)) return;
  const helper = cvText(t, 'decision_helper');
  if (!helper) {
    setCols(C.board.tasks, t.id, { decision_helper: { date: today } });
    tell([C.users.ceo], t.id, `נוסף לתור ההחלטות שלך: ${t.name}`);
    counts.decisions++;
    return;
  }
  const waited = daysBetween(helper, today);
  if (waited >= 3 && waited % 3 === 0) { tell([C.users.ceo], t.id, `ממתין להחלטתך ${waited} ימים: ${t.name}`); counts.decisions++; }
});
pageItems(d, 'helpers').forEach((t) => setCols(C.board.tasks, t.id, { decision_helper: null }));

const partial = truncated(d, 'keyed', 'decisions', 'renewals', 'guarantees', 'defects', 'findings', 'notices', 'urgent', 'projects');
const summary = Object.entries(counts).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(' · ') || 'אין פעולות';
logRow(mb, 'log', {
  result: 'הצליח', sourceBoard: 'משימות ותפעול שוטף', intKey: `A12:${today}`,
  name: `A12 · ${today} · ${summary}${partial.length ? ' · נתונים חלקיים' : ''}`,
  note: partial.length ? `עמוד ראשון בלבד (500): ${partial.join(', ')}` : '',
});
return mb.build({ counts });
