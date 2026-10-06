# Demo data seed — one coherent story across all 18 business boards, so each board's role is visible in context.
# Every item: name ends with "(דמו)", int_key "DEMO:<board>:<n>". Scheduled Make checks skip DEMO projects (isDemo),
# and the values below are chosen so no other rule fires (see monday/demo/README.md §"למה כמעט אין התראות").
# Run via monday MCP execute_code (python). Prints the created ids as JSON. Delete with monday/demo/delete.py.
# The tool call may hit its 60s timeout while the server finishes the batches — check with delete.py (dry run) before re-running.
import json, os, urllib.request, datetime as dt

TODAY = dt.date.fromisoformat(os.environ.get('TODAY', '2026-10-06'))
D = lambda n: (TODAY + dt.timedelta(days=n)).isoformat()
SHAY = 12547623

B = {'clients': 18433850026, 'contacts': 18433850028, 'vendors': 18433850029, 'leads': 18433850030, 'projects': 18433850032,
     'changes': 18433850033, 'journals': 18433850034, 'defects': 18433850035, 'safety': 18433850036, 'budget': 18433850037,
     'orders': 18433850038, 'vinvoices': 18433850039, 'billing': 18433850040, 'guarantees': 18433850041, 'tasks': 18433850042,
     'renewals': 18433850043, 'sensitive': 18433850044, 'snapshot': 18433850045}

def gql(q, v=None):
    req = urllib.request.Request('https://api.monday.com/v2', data=json.dumps({'query': q, 'variables': v or {}}).encode(),
                                 headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=50) as r:
        body = json.loads(r.read())
    if body.get('errors'):
        raise RuntimeError(json.dumps(body['errors'], ensure_ascii=False)[:1500] + ' | data=' + json.dumps(body.get('data'), ensure_ascii=False)[:800])
    return body['data']

# value helpers
st = lambda l: {'label': l}
dd = lambda *l: {'labels': list(l)}
day = lambda n: {'date': D(n)}
me = {'personsAndTeams': [{'id': SHAY, 'kind': 'person'}]}
rel = lambda *ids: {'item_ids': [int(i) for i in ids]}
yes = {'checked': 'true'}
txt = lambda s: {'text': s}
email = lambda e: {'email': e, 'text': e}
phone = lambda p: {'phone': p, 'countryShortName': 'IL'}

ids = {}
counter = {}

def batch(rows):
    """rows: [(ref, board, group_id, name, cv)] → one mutation with aliases; returns nothing, fills ids[ref]."""
    decl, ops, var = [], [], {}
    for i, (ref, board, group, name, cv) in enumerate(rows):
        counter[board] = counter.get(board, 0) + 1
        cv = {**cv, 'int_key': f'DEMO:{board}:{counter[board]}'}
        decl += [f'$n{i}: String!', f'$c{i}: JSON!']
        var[f'n{i}'], var[f'c{i}'] = f'{name} (דמו)', json.dumps(cv, ensure_ascii=False)
        ops.append(f'a{i}: create_item(board_id: {B[board]}, group_id: "{group}", item_name: $n{i}, column_values: $c{i}) {{ id }}')
    data = gql(f'mutation ({", ".join(decl)}) {{ {" ".join(ops)} }}', var)
    for i, (ref, *_rest) in enumerate(rows):
        ids[ref] = int(data[f'a{i}']['id'])

try:
    # ── 1. CRM: companies + suppliers ───────────────────────────────────────────────────────────────
    batch([
        ('client', 'clients', 'group_mm7sc77h', 'אופק נכסים בע״מ',
         {'company_type': st('לקוח'), 'tax_id': '510000001', 'city': 'תל אביב', 'email': email('office@ofek-demo.example.com')}),
        ('architect', 'clients', 'group_mm7s55wp', 'סטודיו כהן-לוי אדריכלים',
         {'company_type': st('אדריכל/מעצב'), 'tax_id': '510000002', 'city': 'רמת גן', 'email': email('studio@cl-demo.example.com')}),
        ('prospect', 'clients', 'group_mm7s8trq', 'נווה טכנולוגיות בע״מ',
         {'company_type': st('לקוח'), 'tax_id': '510000003', 'city': 'הרצליה'}),
        ('v_elec', 'vendors', 'group_mm7sd25e', 'אור-טק חשמל ותקשורת',
         {'vendor_code': 'V-D01', 'tax_id': '510000011', 'vendor_type': st('קבלן משנה'), 'trade': dd('08 מתקני חשמל'),
          'insurance_exp': day(200), 'wht_exp': day(85), 'books_exp': day(85), 'compliance': st('תקין'),
          'framework_exp': day(200), 'bank_status': st('מאומת'), 'bank_callback': st('בוצע'), 'last_rating': {'rating': 4}}),
        ('v_paint', 'vendors', 'group_mm7sd25e', 'צבע ושיפוץ המרכז',
         {'vendor_code': 'V-D02', 'tax_id': '510000012', 'vendor_type': st('קבלן משנה'), 'trade': dd('11 עבודות צבע'),
          'insurance_exp': day(40), 'wht_exp': day(170), 'books_exp': day(170), 'compliance': st('תקין'),
          'bank_status': st('מאומת'), 'bank_callback': st('בוצע'), 'last_rating': {'rating': 3}}),
        ('v_carp', 'vendors', 'group_mm7sd25e', 'נגריית העמק',
         {'vendor_code': 'V-D03', 'tax_id': '510000013', 'vendor_type': st('קבלן משנה'), 'trade': dd('06 נגרות אומן ומסגרות'),
          'insurance_exp': day(210), 'wht_exp': day(175), 'books_exp': day(175), 'compliance': st('תקין'),
          'bank_status': st('מאומת'), 'bank_callback': st('בוצע'), 'last_rating': {'rating': 5}}),
    ])

    # ── 2. contacts + the project (won from lead #1 below) ──────────────────────────────────────────
    batch([
        ('c_dana', 'contacts', 'group_mm7smb8v', 'דנה לוי',
         {'company': rel(ids['client']), 'role': 'מנהלת נכסים', 'email': email('dana@ofek-demo.example.com'), 'phone': phone('+972500000001'),
          'wa_consent': yes, 'consent_date': day(-60)}),
        ('c_uri', 'contacts', 'group_mm7smb8v', 'אורי כהן',
         {'company': rel(ids['architect']), 'role': 'אדריכל ראשי', 'email': email('uri@cl-demo.example.com'), 'phone': phone('+972500000002')}),
        ('project', 'projects', 'group_mm7s6117', 'אופק נכסים — משרדי הנהלה קומה 6',
         {'project_code': 'D26-001', 'phase': st('ביצוע'), 'client': rel(ids['client']), 'pm': me, 'site_mgr': me,
          'timeline': {'from': D(-45), 'to': D(75)}, 'address': {'lat': '32.0853', 'lng': '34.7818', 'address': 'תל אביב (דמו)'},
          'contract_value': '1850000', 'approved_changes': '38000', 'actual_cost': '560000', 'eac': '1620000',
          'forecast_margin': '14.2', 'earned_revenue': '678000', 'as_of_close': {'date': '2026-09-30'},
          'missing_journals': '0', 'unapproved_changes': '9500', 'open_defects': '2', 'on_time': st('טרם')}),
    ])
    P = rel(ids['project'])

    # ── 3. everything that hangs only on the project / companies ───────────────────────────────────
    batch([
        ('lead_won', 'leads', 'group_mm7shkrx', 'אופק נכסים — משרדי הנהלה קומה 6',
         {'lead_type': st('ליד'), 'source': st('הפניה'), 'stage': st('חוזה נחתם'), 'company': rel(ids['client']), 'contact': rel(ids['c_dana']),
          'owner': me, 's_niche': {'rating': 5}, 's_class': {'rating': 4}, 's_credit': {'rating': 4}, 's_designer': {'rating': 4},
          's_schedule': {'rating': 3}, 's_competition': {'rating': 3}, 's_repeat': {'rating': 5}, 's_team': {'rating': 4},
          'expected_value': '1850000', 'probability': '100', 'price': '1850000', 'margin': '14', 'min_margin': '12', 'discount': '0',
          'approval': st('אושר'), 'quote_date': day(-70), 'win_loss': dd('קשר', 'איכות'), 'competitor_price': '1790000',
          'project': P}),
        ('lead_quote', 'leads', 'group_mm7svvvn', 'נווה טכנולוגיות — שיפוץ קומת פיתוח',
         {'lead_type': st('ליד'), 'source': st('LinkedIn'), 'stage': st('בתמחור'), 'company': rel(ids['prospect']), 'owner': me,
          's_niche': {'rating': 4}, 's_class': {'rating': 4}, 's_credit': {'rating': 3}, 's_designer': {'rating': 3},
          's_schedule': {'rating': 4}, 's_competition': {'rating': 3}, 's_repeat': {'rating': 4}, 's_team': {'rating': 4},
          'expected_value': '2400000', 'probability': '40', 'price': '2350000', 'margin': '13', 'min_margin': '12', 'discount': '2',
          'approval': st('ממתין מנכ״ל')}),
        ('lead_new', 'leads', 'group_mm7scqt2', 'הפניה מסטודיו כהן-לוי — משרד בוטיק 400 מ״ר',
         {'lead_type': st('הפניה'), 'source': st('הפניה'), 'stage': st('שיחת היכרות'), 'company': rel(ids['architect']),
          'contact': rel(ids['c_uri']), 'owner': me, 'expected_value': '600000', 'probability': '20', 'approval': st('לא הוגש')}),
        ('bl_elec', 'budget', 'group_mm7s5e6', 'D26-001 · 08 חשמל · קבלן משנה',
         {'cost_code': 'D26-001-08-SC', 'chapter': dd('08 מתקני חשמל'), 'cost_type': dd('SC'), 'orig_budget': '240000',
          'approved_changes': '26000', 'commitments': '216000', 'budget_status': st('תקין'), 'int_status': st('תקין'), 'project': P}),
        ('bl_paint', 'budget', 'group_mm7s5e6', 'D26-001 · 11 צבע · קבלן משנה',
         {'cost_code': 'D26-001-11-SC', 'chapter': dd('11 עבודות צבע'), 'cost_type': dd('SC'), 'orig_budget': '85000',
          'approved_changes': '0', 'commitments': '82500', 'budget_status': st('מעל 90%'), 'int_status': st('תקין'), 'project': P}),
        ('bl_carp', 'budget', 'group_mm7s5e6', 'D26-001 · 06 נגרות · קבלן משנה',
         {'cost_code': 'D26-001-06-SC', 'chapter': dd('06 נגרות אומן ומסגרות'), 'cost_type': dd('SC'), 'orig_budget': '160000',
          'approved_changes': '0', 'commitments': '0', 'budget_status': st('תקין'), 'int_status': st('תקין'), 'project': P}),
        ('bill_1', 'billing', 'group_mm7skewy', 'חשבון חלקי 1 — קומה 6',
         {'bill_code': 'D26-001-B01', 'bill_status': st('שולם'), 'cum_qty': '280000', 'cum_changes': '0', 'prev_bills': '0',
          'retention_pct': '5', 'submitted': day(-40), 'approved_amt': '266000', 'approved_date': day(-33),
          'doc_type': st('חשבונית מס-קבלה'), 'doc_no': 'D-3001', 'due': day(-3), 'paid': '313880', 'collection': st('בזמן'),
          'int_status': st('תקין'), 'project': P}),
        ('bill_2', 'billing', 'group_mm7szrp1', 'חשבון חלקי 2 — קומה 6',
         {'bill_code': 'D26-001-B02', 'bill_status': st('הוגש למפקח'), 'cum_qty': '640000', 'cum_changes': '38000',
          'prev_bills': '266000', 'retention_pct': '5', 'submitted': day(-4), 'collection': st('בזמן'), 'int_status': st('תקין'),
          'project': P}),
        ('g_perf', 'guarantees', 'group_mm7s425g', 'ערבות ביצוע 10% — קומה 6',
         {'g_type': st('ערבות ביצוע'), 'amount': '185000', 'issuer': 'לטובת אופק נכסים · בנק (דמו)', 'expiry': day(200),
          'status': st('בתוקף'), 'project': P}),
        ('g_ins', 'guarantees', 'group_mm7s425g', 'אישור ביטוח עבודות קבלניות — קומה 6',
         {'g_type': st('אישור ביטוח פרויקט'), 'issuer': 'חברת ביטוח (דמו)', 'expiry': day(120), 'status': st('בתוקף'), 'project': P}),
        ('s_train', 'safety', 'group_mm7s2skv', 'הדרכת בטיחות לעובדים חדשים — צוות חשמל',
         {'rec_type': st('הדרכה'), 'date': day(-20), 'performer': me, 'participants': '6', 'project': P}),
        ('s_tour', 'safety', 'group_mm7swwm9', 'סיור בטיחות שבועי',
         {'rec_type': st('סיור שבועי'), 'date': day(-1), 'performer': me, 'project': P}),
        ('s_find', 'safety', 'group_mm7sp9tb', 'פיגום נייד ללא מעקה בחדר השרתים',
         {'rec_type': st('ממצא'), 'date': day(-1), 'performer': me, 'severity': st('בינונית'), 'close_due': day(14), 'project': P}),
        ('j_1', 'journals', 'group_mm7sqyqv', f'יומן עבודה {dt.date.fromisoformat(D(-1)).strftime("%d.%m.%Y")}',
         {'date': day(-1), 'weather': dd('בהיר'), 'submitter': me, 'project': P,
          'work_done': txt('השלמת תוואי כבילה באגף מזרחי · שפכטל שכבה 2 בחדרי ישיבות · מדידות לדלפק קבלה'),
          'issues': txt('אין')}),
        ('j_2', 'journals', 'group_mm7sqyqv', f'יומן עבודה {dt.date.fromisoformat(D(-2)).strftime("%d.%m.%Y")}',
         {'date': day(-2), 'weather': dd('בהיר'), 'submitter': me, 'project': P,
          'work_done': txt('התקנת תעלות חשמל בתקרה · צבע יסוד במסדרון'),
          'issues': txt('עיכוב יום באספקת לוחות חשמל מהספק — לא משפיע על הלו״ז הכולל')}),
        ('d_crack', 'defects', 'group_mm7skmta', 'סדק בגבס בפינת חדר הישיבות',
         {'severity': st('נמוך'), 'location': 'קומה 6 · חדר ישיבות גדול', 'sub': rel(ids['v_paint']), 'due': day(21), 'project': P}),
        ('d_socket', 'defects', 'group_mm7sx7gm', 'שקע חשמל לא תקין בעמדה 14',
         {'severity': st('בינוני'), 'location': 'קומה 6 · אופן-ספייס, עמדה 14', 'sub': rel(ids['v_elec']), 'due': day(14), 'project': P}),
        ('t_handover', 'tasks', 'group_mm7srcpt', 'לתאם מועד מסירת קומה 6 מול מנהלת הנכס',
         {'task_type': st('חד-פעמית'), 'domain': dd('פרויקט'), 'owner': me, 'status': st('בטיפול'), 'priority': st('גבוה'),
          'due': day(14), 'project': P}),
        ('t_follow', 'tasks', 'group_mm7srcpt', 'היתר שילוט בכניסה — ממתין לעירייה',
         {'task_type': st('מעקב מול גורם חיצוני'), 'domain': dd('ציות'), 'owner': me, 'status': st('ממתין לגורם חיצוני'),
          'waiting_for': 'מחלקת שילוט בעירייה', 'followup': day(30), 'due': day(45), 'priority': st('רגיל'), 'project': P}),
        ('t_done', 'tasks', 'group_mm7ssnbn', 'הזמנת ציוד מגן לאתר',
         {'task_type': st('חד-פעמית'), 'domain': dd('פרויקט'), 'owner': me, 'status': st('הושלם'), 'priority': st('רגיל'),
          'due': day(-3), 'project': P}),
        ('r_policy', 'renewals', 'group_mm7sb766', 'פוליסת ביטוח קבלנים — כל הסיכונים',
         {'r_type': dd('פוליסה'), 'counterparty': 'חברת ביטוח (דמו)', 'expiry': day(150), 'annual_cost': '48000', 'owner': me,
          'renewal_status': st('בתוקף')}),
        ('r_car', 'renewals', 'group_mm7s6byg', 'רישיון רכב — טנדר אתר',
         {'r_type': dd('רכב-רישיון'), 'counterparty': 'משרד התחבורה', 'expiry': day(100), 'annual_cost': '1400', 'owner': me,
          'renewal_status': st('בתוקף')}),
        ('sens', 'sensitive', 'group_mm7sen8q', 'גיוס מנהל/ת עבודה לפרויקט קומה 6',
         {'task_type': st('חד-פעמית'), 'domain': dd('משאבי אנוש'), 'owner': me, 'status': st('בטיפול'), 'priority': st('גבוה'),
          'due': day(21), 'project': P}),
        ('snap', 'snapshot', 'group_mm7sk2cm', 'ספטמבר 2026',
         {'low_balance': '180000', 'deficit_weeks': '0', 'backlog': '4200000', 'portfolio_margin': '13.5', 'dso': '52',
          'quote_cycle': '9', 'on_time_pct': '80'}),
    ])

    # ── 4. orders (need budget lines) ───────────────────────────────────────────────────────────────
    batch([
        ('po_elec', 'orders', 'group_mm7s7h27', 'PO-D26-001 · עבודות חשמל ותקשורת קומה 6',
         {'po_code': 'PO-D26-001', 'vendor': rel(ids['v_elec']), 'budget_line': rel(ids['bl_elec']), 'amount': '216000',
          'in_budget': st('כן'), 'framework_price': yes, 'approval': st('מאושר'), 'status': st('נשלח לספק'),
          'planned_delivery': day(-5), 'requester': me, 'int_status': st('תקין'), 'project': P}),
        ('po_paint', 'orders', 'group_mm7s7h27', 'PO-D26-002 · צביעת קומה 6 כולל שפכטל',
         {'po_code': 'PO-D26-002', 'vendor': rel(ids['v_paint']), 'budget_line': rel(ids['bl_paint']), 'amount': '82500',
          'in_budget': st('כן'), 'three_quotes': yes, 'approval': st('מאושר'), 'status': st('נשלח לספק'),
          'planned_delivery': day(20), 'requester': me, 'int_status': st('תקין'), 'project': P}),
        ('po_carp', 'orders', 'group_mm7sghvc', 'PO-D26-003 · דלפק קבלה וארונות',
         {'po_code': 'PO-D26-003', 'vendor': rel(ids['v_carp']), 'budget_line': rel(ids['bl_carp']), 'amount': '64000',
          'in_budget': st('כן'), 'three_quotes': yes, 'approval': st('ממתין סמנכ״ל'), 'status': st('ממתין סמנכ״ל'),
          'planned_delivery': day(35), 'requester': me, 'int_status': st('תקין'), 'project': P}),
    ])

    # ── 5. supplier invoices (need orders) + changes (need budget lines, bill 2) ───────────────────
    batch([
        ('vi_elec', 'vinvoices', 'group_mm7se6z0', 'אור-טק · חשבון 1',
         {'vendor': rel(ids['v_elec']), 'po': rel(ids['po_elec']), 'invoice_no': 'D-1045', 'net_amount': '54000',
          'allocation_no': '000000001', 'three_way': st('תואם'), 'cum_approved': '54000', 'retention': '2700', 'to_pay': '51300',
          'pay_approval': st('אושר'), 'second_approval': st('לא נדרש'), 'paid_date': day(-3), 'paid_by': me,
          'int_status': st('תקין'), 'project': P}),
        ('vi_paint', 'vinvoices', 'group_mm7sycgk', 'צבע ושיפוץ המרכז · חשבון 1',
         {'vendor': rel(ids['v_paint']), 'po': rel(ids['po_paint']), 'invoice_no': '771', 'net_amount': '24750',
          'three_way': st('ללא מספר הקצאה'), 'retention': '1238', 'to_pay': '23512', 'pay_approval': st('ממתין'),
          'int_status': st('תקין'), 'project': P}),
        ('ch_client', 'changes', 'group_mm7snjr3', 'תוספת 6 נקודות חשמל בחדר הישיבות',
         {'change_code': 'CH-D01', 'change_type': st('שינוי ללקוח'), 'status': st('אושר'), 'owner': me,
          'identified': day(-30), 'submitted': day(-27), 'pricing_method': dd('מחירון חוזה'), 'amount': '38000', 'cost': '26000',
          'schedule_impact': '2', 'budget_line': rel(ids['bl_elec']), 'billed_in': rel(ids['bill_2']), 'project': P}),
        ('ch_sub', 'changes', 'group_mm7sjg9g', 'דרישת קבלן החשמל — תוואי כבילה חלופי',
         {'change_code': 'CH-D02', 'change_type': st('דרישת קבלן משנה'), 'status': st('הוגש'), 'owner': me,
          'identified': day(-6), 'submitted': day(-4), 'pricing_method': dd('ניתוח מחיר'), 'amount': '12000',
          'budget_line': rel(ids['bl_elec']), 'project': P}),
        ('ch_unapproved', 'changes', 'group_mm7sjg9g', 'הגבהת מחיצה בחדר המנכ״ל',
         {'change_code': 'CH-D03', 'change_type': st('שינוי ללקוח'), 'status': st('בוצע ללא אישור'), 'owner': me,
          'identified': day(-10), 'amount': '9500', 'cost': '6000', 'executed': yes, 'budget_line': rel(ids['bl_carp']), 'project': P}),
    ])

    # ── 6. journal crew rows (subitems: contractor, workers, hours) ─────────────────────────────────
    cols = gql('{ boards(ids: [%d]) { columns(ids: ["subtasks_mm7sa5w0"]) { settings_str } } }' % B['journals'])
    sub_board = json.loads(cols['boards'][0]['columns'][0]['settings_str'])['boardIds'][0]
    scols = {c['title']: c['id'] for c in gql('{ boards(ids: [%d]) { columns { id title } } }' % sub_board)['boards'][0]['columns']}
    crews = [('j_1', 'אור-טק חשמל ותקשורת', 'v_elec', 4, 36), ('j_1', 'צבע ושיפוץ המרכז', 'v_paint', 3, 27), ('j_1', 'צוות עצמי', None, 2, 18),
             ('j_2', 'אור-טק חשמל ותקשורת', 'v_elec', 5, 45), ('j_2', 'צבע ושיפוץ המרכז', 'v_paint', 2, 18)]
    decl, ops, var = [], [], {}
    for i, (parent, name, vendor, workers, hours) in enumerate(crews):
        cv = {scols['מספר עובדים']: str(workers), scols['שעות']: str(hours)}
        if vendor: cv[scols['קבלן משנה']] = rel(ids[vendor])
        decl += [f'$n{i}: String!', f'$c{i}: JSON!']
        var[f'n{i}'], var[f'c{i}'] = name, json.dumps(cv, ensure_ascii=False)
        ops.append(f's{i}: create_subitem(parent_item_id: {ids[parent]}, item_name: $n{i}, column_values: $c{i}) {{ id }}')
    data = gql(f'mutation ({", ".join(decl)}) {{ {" ".join(ops)} }}', var)
    ids['subitems'] = [int(data[f's{i}']['id']) for i in range(len(crews))]
    ids['_sub_board'] = int(sub_board)
finally:
    print(json.dumps(ids, ensure_ascii=False))
