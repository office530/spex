// M08 — daily collection ladder (07:00). Works next to the built-in A10 date reminders.
// input: bills (items with approved_amt, paid, due, collection, bill_status), today (optional)
// Stage from days past due while a balance (incl. 18% VAT) is open:
//   <7 "בזמן" · 7 "7 תזכורת" · 14 "14 שיחת PM" · 21 "21 שיחת סמנכ״ל" · 30 "30 מכתב מנכ״ל" · 45 "45 עו״ד"
const VAT = 1.18;
const today = input.today || todayIL();
const mb = mutationBuilder();
const moved = [];
let openTotal = 0;
let overdueTotal = 0;
const ladder = [[45, '45 עו״ד'], [30, '30 מכתב מנכ״ל'], [21, '21 שיחת סמנכ״ל'], [14, '14 שיחת PM'], [7, '7 תזכורת']];

(input.bills || pageItems(input.data, 'bills')).forEach((b, i) => {
  const balance = Math.round(num(cvText(b, 'approved_amt')) * VAT - num(cvText(b, 'paid')));
  const due = cvText(b, 'due');
  if (balance <= 0 || !due) return; // nothing to collect / not invoiced yet
  openTotal += balance;
  const late = Math.max(daysBetween(due, today), 0);
  if (late > 0) overdueTotal += balance;
  const stage = (ladder.find(([d]) => late >= d) || [0, 'בזמן'])[1];
  if (cvText(b, 'collection') === stage) return;
  mb.op(`b${i}: change_multiple_column_values(board_id: ${C.board.billing}, item_id: ${b.id}, column_values: ${mb.v('JSON!', JSON.stringify({ collection: { label: stage }, int_key: `M08:${b.id}:${stage}` }))}) { id }`);
  moved.push(`${b.name}: ${stage} (${late} ימים, ${balance.toLocaleString('he-IL')} ש״ח)`);
  if (late >= 21) notify(mb, `n${i}`, late >= 30 ? C.users.ceo : C.users.vp, b.id, `גבייה: ${b.name} — ${late} ימי איחור, יתרה ${balance.toLocaleString('he-IL')} ש״ח (${stage})`);
});

logRow(mb, 'log', {
  result: 'הצליח', sourceBoard: 'חשבונות חלקיים וגבייה', intKey: `M08:${today}`,
  name: `M08 · ${today} · פתוח ${Math.round(openTotal).toLocaleString('he-IL')} · באיחור ${Math.round(overdueTotal).toLocaleString('he-IL')} · ${moved.length} עדכונים`,
  note: moved.join('\n'),
});
return mb.build({ moved: moved.length, openTotal, overdueTotal });
