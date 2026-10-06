// M03 — approval routing + approver verification (§9). One decision for four boards.
// input: items (fetch: the item incl. linked items), users (fetch: [{id,name}]), boardId, columnId,
//        label (new label text), prevLabel, userId (who changed it), changedAt
// Output: mutationBuilder result (+ decision summary for tests).
const it = input.item || (input.items || [])[0];
const mb = mutationBuilder();
if (!it) return mb.build({ decision: 'item-missing' });

const id = Number(it.id);
const board = String(input.boardId);
const label = input.label || '';
const prev = input.prevLabel || '';
const actor = Number(input.userId) || 0;
const actorName = input.userName || (input.users || []).find((u) => Number(u.id) === actor)?.name || `משתמש ${actor}`;
const isCeo = actor === C.users.ceo;
const isVp = actor === C.users.vp;
const fmt = (n) => Math.round(n).toLocaleString('he-IL');
const checked = (col) => { const v = cvValue(it, col); return v?.checked === true || v?.checked === 'true'; };
const linked = (col) => (it.column_values ?? []).find((c) => c.id === col)?.linked_items ?? [];
const linkedChecked = (li, col) => { const v = cvValue(li, col); return v?.checked === true || v?.checked === 'true'; };
const currentKey = cvText(it, 'int_key');

const project = linked('project')[0];
const pmIds = project ? personIds(project, 'pm') : [];
const requesterIds = personIds(it, 'requester').concat(personIds(it, 'owner'));
const TIER = {
  pm: { name: 'מנהל פרויקט', waiting: 'ממתין מנהל פרויקט' },
  vp: { name: 'סמנכ״ל', waiting: 'ממתין סמנכ״ל' },
  ceo: { name: 'מנכ״ל', waiting: 'ממתין מנכ״ל' },
};
const approversFor = (tier) => (tier === 'pm' ? (pmIds.length ? pmIds : [C.users.vp]) : tier === 'vp' ? [C.users.vp] : [C.users.ceo]);
// Anyone above the required tier may also approve.
const allowedFor = (tier) => [...new Set(tier === 'pm' ? [...pmIds, C.users.vp, C.users.ceo] : tier === 'vp' ? [C.users.vp, C.users.ceo] : [C.users.ceo])];
const setCols = (cols) => mb.op(`set: change_multiple_column_values(board_id: ${board}, item_id: ${id}, column_values: ${mb.v('JSON!', JSON.stringify(cols))}) { id }`);
const log = (result, name, note = '', key = '') => logRow(mb, 'log', { result, sourceBoard: board, sourceItem: id, intKey: key, name, note });
const notifyAll = (ids, text) => [...new Set(ids)].forEach((u, i) => notify(mb, `n${i}`, u, id, text));
const done = (decision, extra = {}) => mb.build({ decision, ...extra });

/** Route to the right approver once; same amount + tier = duplicate event → skip. */
function route(tier, key, cols, summary) {
  if (currentKey === key) return done('duplicate');
  const hasIntStatus = board !== String(C.board.changes); // שינויים וחריגים has no int_status column
  setCols({ ...cols, int_key: key, ...(hasIntStatus ? { int_status: { label: 'תקין' } } : {}) });
  notifyAll(approversFor(tier), `נדרש אישור ${TIER[tier].name}: ${it.name} — ${summary}`);
  update(mb, 'upd', id, `🔀 נותב לאישור ${TIER[tier].name}. ${summary}`);
  log('הצליח', `M03 · ${it.name} · נותב ל${TIER[tier].name}`, summary, key);
  return done(`route-${tier}`);
}
function reject(reasons, cols) {
  setCols(cols);
  update(mb, 'upd', id, `⛔ לא נותב לאישור:\n• ${reasons.join('\n• ')}`);
  notifyAll(requesterIds.length ? requesterIds : [C.users.vp], `ההגשה של "${it.name}" הוחזרה: ${reasons[0]}`);
  log('דולג', `M03 · ${it.name} · הוחזר לתיקון`, reasons.join(' | '));
  return done('rejected', { reasons });
}
function unauthorized(tier, revertCols) {
  setCols(revertCols);
  update(mb, 'upd', id, `⛔ ${actorName} אינו מורשה לאשר בדרג ${TIER[tier].name}. האישור בוטל והפריט הוחזר להמתנה.`);
  notify(mb, 'nvp', C.users.vp, id, `ניסיון אישור לא מורשה: ${it.name} (${actorName})`);
  log('הוסלם', `M03 · ${it.name} · אישור לא מורשה`, `user ${actor}, required ${tier}`);
  return done('unauthorized');
}

// ───────────── הזמנות רכש ועבודה ─────────────
if (board === String(C.board.orders)) {
  const amount = num(cvText(it, 'amount'));
  const inBudgetText = cvText(it, 'in_budget');
  const inBudget = inBudgetText === 'כן';
  const tier = inBudget ? (amount <= 30000 ? 'pm' : amount <= 150000 ? 'vp' : 'ceo') : (amount <= 20000 ? 'vp' : 'ceo');

  if (input.columnId === 'status' && label === 'הוגש לאישור') {
    const vendor = linked('vendor')[0];
    const reasons = [];
    if (amount <= 0) reasons.push('חסר סכום');
    if (!vendor) reasons.push('חסר ספק');
    if (!linked('budget_line').length) reasons.push('חסרה שורת תקציב');
    if (!inBudgetText) reasons.push('יש לסמן "בתקציב" כן/לא');
    if (amount > 20000 && !checked('framework_price') && !checked('three_quotes')) reasons.push('מעל 20,000 ש״ח ללא מחיר מסגרת — נדרשות 3 הצעות');
    if (vendor) {
      const comp = cvText(vendor, 'compliance');
      if (linkedChecked(vendor, 'pay_block') || comp === 'פג תוקף' || comp === 'חסר') reasons.push(`הספק ${vendor.name} חסום / לא בציות (${comp || 'חסימת תשלום'})`);
    }
    if (reasons.length) return reject(reasons, { status: { label: 'טיוטה' }, approval: { label: 'טיוטה' } });
    return route(tier, `M03:${id}:${amount}:${tier}`, { approval: { label: TIER[tier].waiting }, status: { label: TIER[tier].waiting } },
      `${fmt(amount)} ש״ח, ${inBudget ? 'בתקציב' : 'מחוץ לתקציב'}`);
  }

  if (input.columnId === 'approval' && (label === 'מאושר' || label === 'נדחה')) {
    if (!allowedFor(tier).includes(actor)) return unauthorized(tier, { approval: { label: TIER[tier].waiting } });
    const approved = label === 'מאושר';
    setCols({ status: { label: approved ? 'מאושר' : 'טיוטה' } });
    update(mb, 'upd', id, `${approved ? '✅ אושר' : '❌ נדחה'} ע״י ${actorName} (דרג ${TIER[tier].name}).`);
    notifyAll(requesterIds, `ההזמנה "${it.name}" ${approved ? 'אושרה' : 'נדחתה'} ע״י ${actorName}`); // A01
    log('הצליח', `M03 · ${it.name} · ${approved ? 'אושר' : 'נדחה'} ע״י ${actorName}`, '', `M03:${id}:${label}:${actor}`);
    return done(approved ? 'approved' : 'declined');
  }
  return done('ignored');
}

// ───────────── לידים והזדמנויות — אישור הצעה ─────────────
if (board === String(C.board.leads)) {
  const price = num(cvText(it, 'price'));
  const margin = num(cvText(it, 'margin'));
  const minMargin = num(cvText(it, 'min_margin'));
  const discount = num(cvText(it, 'discount'));
  const tier = price > 1500000 || (cvText(it, 'min_margin') !== '' && margin < minMargin) || discount > 3 ? 'ceo' : 'vp';
  const waiting = [TIER.vp.waiting, TIER.ceo.waiting];

  if (input.columnId === 'approval' && waiting.includes(label) && !waiting.includes(prev)) {
    const reasons = [];
    if (price <= 0) reasons.push('חסר מחיר הצעה');
    if (cvText(it, 'margin') === '') reasons.push('חסרה רווחיות %');
    if (reasons.length) return reject(reasons, { approval: { label: 'דרוש תיקון' } });
    return route(tier, `M03:L:${id}:${price}:${margin}:${discount}:${tier}`, { approval: { label: TIER[tier].waiting } },
      `הצעה ${fmt(price)} ש״ח, רווחיות ${margin}%, הנחה ${discount}%`);
  }
  if (input.columnId === 'approval' && (label === 'אושר' || label === 'נדחה')) {
    if (!allowedFor(tier).includes(actor)) return unauthorized(tier, { approval: { label: TIER[tier].waiting } });
    update(mb, 'upd', id, `${label === 'אושר' ? '✅ ההצעה אושרה' : '❌ ההצעה נדחתה'} ע״י ${actorName}.`);
    notifyAll(personIds(it, 'owner'), `הצעת המחיר "${it.name}" ${label === 'אושר' ? 'אושרה' : 'נדחתה'} ע״י ${actorName}`);
    log('הצליח', `M03 · ${it.name} · הצעה ${label}`, '', `M03:L:${id}:${label}:${actor}`);
    return done(label === 'אושר' ? 'approved' : 'declined');
  }
  return done('ignored');
}

// ───────────── חשבונות ספקים לאישור — אישור תשלום ─────────────
if (board === String(C.board.vinvoices)) {
  const toPay = num(cvText(it, 'to_pay'));
  const net = num(cvText(it, 'net_amount'));
  const firstApprover = Number((currentKey.match(/^M03:VI:\d+:pay:(\d+)/) || [])[1] || 0);

  if (input.columnId === 'pay_approval' && label === 'אושר') {
    // Separation of duties: quantities by PM (three-way match), payment by VP/CEO only.
    if (!isVp && !isCeo) return unauthorized('vp', { pay_approval: { label: 'ממתין' } });
    const vendor = linked('vendor')[0];
    const reasons = [];
    if (cvText(it, 'three_way') !== 'תואם') reasons.push(`התאמה משולשת: ${cvText(it, 'three_way') || 'לא נבדק'}`);
    if (net > 5000 && !cvText(it, 'allocation_no')) reasons.push('חשבונית מעל 5,000 ש״ח ללא מספר הקצאה');
    if (vendor) {
      const comp = cvText(vendor, 'compliance');
      if (linkedChecked(vendor, 'pay_block') || comp === 'פג תוקף' || comp === 'חסר') reasons.push(`הספק ${vendor.name} חסום לתשלום (${comp || 'חסימה'})`);
    } else reasons.push('חסר ספק');
    if (reasons.length) return reject(reasons, { pay_approval: { label: 'דרוש תיקון' } });
    const needSecond = toPay > 50000;
    setCols({ second_approval: { label: needSecond ? 'ממתין' : 'לא נדרש' }, int_key: `M03:VI:${id}:pay:${actor}`, int_status: { label: 'תקין' } });
    update(mb, 'upd', id, `✅ אישור תשלום ראשון ע״י ${actorName} (${fmt(toPay)} ש״ח).${needSecond ? ' מעל 50,000 ש״ח — נדרש אישור שני של בעל תפקיד אחר.' : ''}`);
    if (needSecond) notify(mb, 'n2', isCeo ? C.users.vp : C.users.ceo, id, `נדרש אישור תשלום שני: ${it.name} — ${fmt(toPay)} ש״ח`);
    log('הצליח', `M03 · ${it.name} · אישור תשלום ראשון`, '', `M03:VI:${id}:pay:${actor}`);
    return done(needSecond ? 'first-approval-second-needed' : 'approved');
  }
  if (input.columnId === 'second_approval' && label === 'אושר') {
    if ((!isVp && !isCeo) || actor === firstApprover) {
      setCols({ second_approval: { label: 'ממתין' } });
      update(mb, 'upd', id, `⛔ אישור שני חייב להיות של סמנכ״ל/מנכ״ל אחר מהמאשר הראשון. ${actorName} אינו יכול לאשר.`);
      log('הוסלם', `M03 · ${it.name} · אישור שני לא תקין`, `user ${actor}, first ${firstApprover}`);
      return done('second-unauthorized');
    }
    update(mb, 'upd', id, `✅ אישור תשלום שני ע״י ${actorName}.`);
    log('הצליח', `M03 · ${it.name} · אישור תשלום שני`, '', `M03:VI:${id}:second:${actor}`);
    return done('second-approved');
  }
  return done('ignored');
}

// ───────────── שינויים וחריגים — דרישות קבלני משנה ─────────────
if (board === String(C.board.changes)) {
  if (cvText(it, 'change_type') !== 'דרישת קבלן משנה') return done('client-change-no-routing');
  const amount = num(cvText(it, 'amount'));
  const tier = amount <= 10000 ? 'pm' : amount <= 50000 ? 'vp' : 'ceo';
  if (input.columnId === 'status' && label === 'הוגש') {
    if (amount <= 0) return reject(['חסר סכום לדרישה'], { status: { label: 'בתמחור' } });
    return route(tier, `M03:CO:${id}:${amount}:${tier}`, {}, `דרישת קבלן משנה ${fmt(amount)} ש״ח`);
  }
  if (input.columnId === 'status' && label === 'אושר') {
    if (!allowedFor(tier).includes(actor)) return unauthorized(tier, { status: { label: 'הוגש' } });
    update(mb, 'upd', id, `✅ דרישת הקבלן אושרה ע״י ${actorName} (דרג ${TIER[tier].name}).`);
    log('הצליח', `M03 · ${it.name} · דרישה אושרה`, '', `M03:CO:${id}:approved:${actor}`);
    return done('approved');
  }
  return done('ignored');
}

return done('unknown-board');
