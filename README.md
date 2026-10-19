# SINBUVI Systems — V9 academic prototype

Glass/aluminum supply website and role-aware portal: HTML/CSS/vanilla JavaScript, PHP8.2/PDO and MariaDB/MySQL under Windows XAMPP. No framework/build step. Public site: http://localhost/SINBUVI_Systems/ ; Client Portal / Login opens Owner/Staff/Client sign-in. Start Apache/MySQL, then START_DEMO.bat checks configuration and opens the configured URL.

## Setup

Fresh laptop: extract release/SINBUVI_V9_Demo.zip into XAMPP htdocs. Copy config/local.example.php to protected config/local.php; set a new empty database name and actual base URL. Run `<xampp>\php\php.exe database\import-demo.php --database=sinbuvi_v9_demo`, configure that same name, then run `<xampp>\php\php.exe _codex\demo-preflight.php` and START_DEMO.bat. Alternatively import database/sinbuvi-demo-v9.sql into an empty database through phpMyAdmin/native MySQL. Includes28 business tables,3 views,30 products and21 company photographs. Matching repeat imports preserve rows; unrelated occupied databases are refused.

Existing V7/V8: back up source/SQL, configure the existing database and run `php database/upgrade.php`. Never run the original destructive installer over existing data. See [database/README.md](database/README.md) for prerequisites, precise data effects, schema-only option, export and rollback. Setup does not reset original users, stock or legitimate receipts.

## Classroom accounts

| Portable role | Username | Initial password |
|---|---|---|
| Owner | demo.owner | OwnerDemo!2026 |
| Dante Reyes | staff1 | Staff!Singin26 |
| Ace Reyes | staff2 | Staff!Singin26 |
| Client | demo.client1 | clientdemo |

Other portable clients: demo.client<ID>/clientdemo. Later staff retain their usernames and receive Staff!Singin26 only in the sanitized export. Normal installation credentials and user-selected passwords stay unchanged; known local pairs are in protected _codex/DEMO_CREDENTIALS.md. The later new_staff account is preserved; removed staff3 remains absent. Email recovery is visibly simulated, not SMTP delivery.

## Financial rules

A proposal is unit price × negotiation quantity, applied as a whole-order adjustment on final Owner approval. Catalog prices/line quantities remain intact. Pending counters and Staff recommendations never reprice orders. Expired offers cannot be approved; counters renew configurable7-day validity. Expiring Soon means within48 hours. Deadline notifications are deduplicated during portal synchronization; no background worker is claimed while the application is closed.

New orders start **Unpaid**, including Owner-created orders. Owner records actual money received. Deposit is40% rounded to cents; completion installment is exactly final total minus deposit. Receipts below total show **Partially Paid**; cumulative qualifying receipts covering total show **Fully Paid**. Receive deposit, explicitly mark work completed, then record the remaining installment. Completion records no payment. Pending/overdue intentions are not receipts; their balance closes when actual payments settle the order. Actual Paid/Refunded history cannot be downgraded by a status toggle.

One PHP service supplies original/agreed amount, adjustment,40/60 terms, received funds, outstanding and recognition. Full final total is recognized once when cumulative dated Paid receipts first cover it. Deposits alone, pending/undated/future/refunded amounts and cancelled orders create no realized revenue. Category allocation uses final totals without multiplying joins. Settled/fulfilled orders cannot be repriced; a new total cannot fall below recorded funds. This is a prototype full-settlement rule, not a general accounting ledger.

Live pre-seed audit: September2026 PHP19,600; October PHP0 because October requests were unpaid. After six labeled fictional scenarios: September PHP20,100; October PHP500. Each month includes PHP500 fictional fully paid revenue, explicitly identified in financial views and order details. Authentic received payments were not changed. These are dated snapshots, not hardcoded chart values.

Forecasting uses the same recognized history: last three complete months weighted1:2:3, zero gaps retained, current partial actual displayed separately. Next-month projection/range is not realized income or a guarantee. Historical saved forecasts retain their model identity.

Client quotations accept today/future Manila requested dates, never yesterday. Requested date is separate from actual creation/order chronology. Historical quotations remain readable; Owner historical transaction dates retain the earlier rule. Displays use AM/PM; database/API date/time values remain canonical.

## Permissions and undo

| Capability | Owner/Admin | Staff | Client |
|---|---|---|---|
| Prices/payments/finance/accounts/inventory | Authorized management | No writes | Own records only |
| Negotiations | Counter/final decision | Recommend only | Own offers/counters |
| Scheduling | Assign1–3 eligible personnel | Own hours/assigned work | Own booking requests |
| Profiles/notifications | Own | Own | Own |
| Reviews/inquiries | Moderate/manage | No administration | Own reviews/public submission |
| Saved undo | Audited guarded compensation | No | No |

Unsaved modal edits/material rows support local undo. Owner → Undo saved change supports eligible inventory adjustments, active future schedule changes, inquiry/review moderation and safe negotiation decisions. Later payments/fulfillment, stock movements, stale edits and duplicate reversals block unsafe undo. Compensation retains audit/history and never deletes money records. Only changes captured since V9 have saved undo snapshots.

Weekly hours/date overrides/time off, conflict-safe teams, registration, profiles/recovery, notifications/login summaries, reviews, inquiries, media, search, reports, receipts and responsive layouts remain operational. APIs enforce roles/ownership; MySQL is authoritative. Explicit browser-only legacy mode remains separately labeled and never supplies connected financial facts.

## Verification and limits

Current evidence: [test results](docs/FINAL_TEST_RESULTS.md), _codex/v9-test-ledger.json, [audit](docs/FINAL_AUDIT_REPORT.md), and [walkthrough](DEMO_GUIDE.md). Optional _codex/run-v9-tests.ps1 uses Node/Playwright/Chrome via qa-runtime.ps1; these are QA dependencies only. It creates disposable databases and owned loopback servers. Older numbered suites are historical evidence, not additional V9 passes. Normal comparison: v9-live-smoke.cjs with optional SINBUVI_NORMAL_URL/USERNAME/PASSWORD.

No production-readiness claim. Second physical laptop, shared Windows/Apache/MySQL reboot, real printer/manual assistive review and other browser/database engines remain unverified. Received-payment reversals and retrospective financial restatements are deliberately not automated. Local relocation/import tests are documented separately from physical-device checks.
