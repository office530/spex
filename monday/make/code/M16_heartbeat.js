// M16 — daily heartbeat (08:00). Uses the integration log itself as the signal: every scheduled scenario writes a
// daily summary row, so a missing row = a scenario that did not run. Also counts open failures (§8.7.3).
// input: data = { log } (latest log rows), today (optional)
const d = input.data || {};
const today = input.today || todayIL();
const mb = mutationBuilder();
const rows = pageItems(d, 'log');
const dow = new Date(`${today}T12:00:00Z`).getUTCDay(); // 0 = Sunday … 6 = Saturday
const yesterday = new Date(Date.parse(`${today}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);
const ranOn = (code, date) => rows.some((r) => cvText(r, 'scenario') === code && cvText(r, 'run_time').startsWith(date));

// Expected cadence (Israel time): M09b 02:00, A12 05:30, M07 06:00, M08 07:00 daily; M11b 17:00 Sun–Thu (checked for yesterday);
// A17 Thursday 12:00 (checked on Friday).
const expected = [['M09b', today], ['A12', today], ['M07', today], ['M08', today]];
if (dow >= 1 && dow <= 5) expected.push(['M11b', yesterday]); // yesterday was Sun–Thu
if (dow === 5) expected.push(['A17', yesterday]);
const missing = expected.filter(([code, date]) => !ranOn(code, date)).map(([code, date]) => `${code} (${date})`);
// M16's own alert rows are excluded, otherwise one unhandled alert would re-alert every morning forever.
const openFailures = rows.filter((r) => cvText(r, 'scenario') !== 'M16' && ['נכשל', 'הוסלם'].includes(cvText(r, 'result')) && cvText(r, 'handled') !== 'v');

const ok = missing.length === 0 && openFailures.length === 0;
if (!ok) {
  const text = [missing.length ? `לא רצו: ${missing.join(', ')}` : '', openFailures.length ? `${openFailures.length} שגיאות פתוחות ביומן` : ''].filter(Boolean).join(' · ');
  notify(mb, 'n', C.users.vp, openFailures[0]?.id || rows[0]?.id, `בדיקת דופק: ${text}`);
}
logRow(mb, 'log', {
  result: ok ? 'הצליח' : 'הוסלם', sourceBoard: 'יומן אינטגרציות', intKey: `M16:${today}`,
  name: `M16 · ${today} · ${ok ? 'תקין' : 'התראה'}${missing.length ? ` · חסר: ${missing.join(', ')}` : ''}${openFailures.length ? ` · ${openFailures.length} שגיאות פתוחות` : ''}`,
  note: openFailures.slice(0, 20).map((r) => r.name).join('\n'),
});
return mb.build({ ok, missing, openFailures: openFailures.length });
