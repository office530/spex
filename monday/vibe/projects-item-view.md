# Vibe item view — "כרטיס פרויקט" (board: תיק פרויקטים 18433850032)

Status: **blocked** — `vibe_create` (variant `vibe_item_view`) returned `AI_CREDITS_NOT_ELIGIBLE` on 4.10.2026.
Unblock: enable AI credits / the Vibe package in monday Administration, then run `vibe_create` with this prompt
(variant `vibe_item_view`, board_ids `["18433850032"]`). The same template applies to every board: sections follow
`mainOrder` in `../ui.mjs`; automation-written columns are read-only.

Automation-written (read-only) columns per board, from `../make/code`:
projects: approved_changes, unapproved_changes, open_defects, missing_journals (+ M10 financials) ·
budget: approved_changes, commitments, budget_status · vendors: compliance, pay_block · billing: collection ·
tasks: decision_helper · all boards: int_key, int_status.

## Prompt

Build an ITEM VIEW (custom item card) for the board "תיק פרויקטים" (project portfolio of an office fit-out contractor). The entire UI must be in Hebrew, right-to-left (dir="rtl"), clean and dense, desktop-first. Name the app "כרטיס פרויקט".

Show the current item's data in this order (usability order: identify → state → who → when → money → exceptions → details → system). Use the real column ids below; show the column's Hebrew title as the label.

1. HEADER (sticky): item name (large, bold), project_code (קוד פרויקט) as a small chip, phase (שלב) as a colored pill using the status label's own color, and on_time (מסירה בזמן) as a small pill.
2. "אנשים ולוחות זמנים" section: client (לקוח, board-relation — show linked item names), pm (מנהל פרויקט), site_mgr (מנהל ביצוע), timeline (ציר זמן) shown as from–to dates in DD/MM/YYYY plus a thin progress bar of elapsed days vs total and the text "נותרו X ימים" (or "באיחור X ימים" in red after the end date).
3. "כסף" section as KPI tiles (format as ₪ with thousands separators, he-IL locale, no decimals): contract_value (ערך חוזה), approved_changes (שינויים מאושרים), unapproved_changes (שינויים ללא אישור — orange tile when > 0), actual_cost (עלות בפועל), eac (צפי עלות לסיום), forecast_margin (רווחיות צפויה % — red when < 10, green when ≥ 15), earned_revenue (הכנסה שהורווחה), over_under (חיוב יתר/חסר — red when negative). Under the tiles show as_of_close (נכון לסגירת חודש) and fin_freshness (עדכניות נתון כספי) as small grey text.
4. "חריגים" section: open_defects (ליקויים פתוחים — red badge when > 0), missing_journals (ימי יומן חסרים — red when > 2), unapproved_changes again as a warning line if > 0. If all are zero show a green "אין חריגים".
5. "פרטים" section: address (כתובת, location — show text and a "פתח במפות" link), drive_folder (תיקיית Drive — clickable link button), nps (NPS), board_relation_mm7s6nn0 (ליד מקור — linked item name).
6. Collapsed "מערכת" footer (closed by default, small grey): rec_id (מזהה), created (נוצר), int_key.

Editing rules (important — numbers are written by automations):
- Editable inline: name, phase, pm, site_mgr, timeline, address, drive_folder, nps, on_time.
- READ-ONLY (display only, show a small lock icon and tooltip "מחושב אוטומטית"): approved_changes, unapproved_changes, open_defects, missing_journals, actual_cost, eac, forecast_margin, earned_revenue, over_under, as_of_close, fin_freshness, project_code, rec_id, created, int_key, client, board_relation_mm7s6nn0.
- Never write to any read-only column.

Behaviour: read live values for the current item, refresh after edits, show a skeleton while loading, show "—" for empty values, no English text anywhere, no emoji (use simple line icons). Keep it fast: one query for the item.
