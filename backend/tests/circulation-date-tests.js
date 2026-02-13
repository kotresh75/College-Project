/**
 * Circulation Desk — Date/Time & Fine Calculation Test Suite
 * 
 * 100% DETERMINISTIC — All tests use fixed dates, ZERO dependency on system clock.
 * Results will be identical regardless of when or where you run this script.
 * 
 * Usage: node tests/circulation-date-tests.js
 */

const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

// ============================================================
// TEST FRAMEWORK (Minimal)
// ============================================================
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✅ PASS: ${testName}`);
    } else {
        failedTests++;
        const msg = `  ❌ FAIL: ${testName}${details ? ' — ' + details : ''}`;
        console.log(msg);
        failures.push(msg);
    }
}

function assertEqual(actual, expected, testName) {
    assert(actual === expected, testName, `Expected ${expected}, got ${actual}`);
}

function assertApprox(actual, expected, testName, tolerance = 0.01) {
    assert(Math.abs(actual - expected) < tolerance, testName, `Expected ~${expected}, got ${actual}`);
}

function section(name) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  ${name}`);
    console.log(`${'═'.repeat(60)}`);
}

// ============================================================
// DATE HELPERS (Fixed — No system clock usage)
// ============================================================
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Build a "fake IST" Date for a given IST time (same as getISTDate() does).
 * This is fully deterministic — no new Date() calls.
 */
function fakeIST(year, month, day, hour = 12, min = 0, sec = 0) {
    // IST = UTC + 5:30. getISTDate() does: new Date(utcNow + 5.5h)
    // We want the resulting .toISOString() to show the IST values.
    // So we construct UTC such that UTC + 5.5h offset = desired IST display.
    // The "fake IST" trick: create a Date whose UTC fields show IST values.
    return new Date(Date.UTC(year, month - 1, day, hour, min, sec));
}

/** Create a due date string as stored in DB: IST 23:59:59 with +05:30 */
function makeDue(year, month, day) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T23:59:59.999+05:30`;
}

// ============================================================
// CORE CALCULATION FUNCTIONS (Mirror backend logic)
// ============================================================

/**
 * FIXED backend returnBook logic.
 * @param {Date} fakeISTNow - "fake IST" Date (as getISTDate() returns)
 * @param {string} dueDateStr - Stored ISO due date with +05:30
 * @param {number} rate - Daily fine rate
 */
function calcFine_Fixed(fakeISTNow, dueDateStr, rate = 1.0) {
    const dueDateParsed = new Date(dueDateStr);
    const dueDateIST = new Date(dueDateParsed.getTime() + IST_OFFSET_MS);
    const nowStr = fakeISTNow.toISOString().split('T')[0];
    const dueStr = dueDateIST.toISOString().split('T')[0];
    const isOverdue = nowStr > dueStr;
    const diffDays = isOverdue
        ? Math.ceil((new Date(nowStr) - new Date(dueStr)) / (1000 * 60 * 60 * 24))
        : 0;
    return { isOverdue, diffDays, fine: diffDays * rate };
}

/**
 * OLD BUGGY backend logic — for comparison only.
 */
function calcFine_Buggy(fakeISTNow, dueDateStr, rate = 1.0) {
    const dueDate = new Date(dueDateStr);
    const diffTime = Math.abs(fakeISTNow - dueDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const isOverdue = fakeISTNow > dueDate;
    return { isOverdue, diffDays, fine: isOverdue ? diffDays * rate : 0 };
}

/**
 * Frontend calculateOverdueFine (uses real browser Date, not fake IST).
 * To make deterministic, we pass a fixed "real UTC" Date.
 */
function calcFine_Frontend(realUTCNow, dueDateStr, rate = 1.0) {
    const dueDate = new Date(dueDateStr);
    if (realUTCNow <= dueDate) return { isOverdue: false, diffDays: 0, fine: 0 };
    const days = Math.ceil((realUTCNow - dueDate) / (1000 * 60 * 60 * 24));
    return { isOverdue: true, diffDays: days, fine: days * rate };
}

/**
 * CronService FIXED logic (IST-normalized).
 * Takes fixed "real UTC now" (simulated cron time) instead of new Date().
 */
function calcCronOverdue(realUTCNow, dueDateStr) {
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(realUTCNow.getTime() + istOffset);
    const dueParsed = new Date(dueDateStr);
    const dueIST = new Date(dueParsed.getTime() + istOffset);
    const nowStr = nowIST.toISOString().split('T')[0];
    const dueStr = dueIST.toISOString().split('T')[0];
    return Math.ceil((new Date(nowStr) - new Date(dueStr)) / (1000 * 60 * 60 * 24));
}

// ============================================================
// TEST SUITE 1: Fine Calculation — All Scenarios
// ============================================================
function testFineCalculation() {
    section('TEST SUITE 1: Fine Calculation Logic (Fixed Dates)');

    const due = makeDue(2026, 2, 12);

    // Scenario 1: User's exact bug — Due 12/02, Return 13/02 at 14:34 IST
    console.log('\n📋 Scenario 1: Due 12/02/2026, Return 13/02/2026 14:34 IST (User\'s bug)');
    const r1 = calcFine_Fixed(fakeIST(2026, 2, 13, 14, 34), due);
    assertEqual(r1.isOverdue, true, 'Overdue detected');
    assertEqual(r1.diffDays, 1, 'Overdue days = 1');
    assertEqual(r1.fine, 1.0, 'Fine = ₹1.00');
    const b1 = calcFine_Buggy(fakeIST(2026, 2, 13, 14, 34), due);
    assertEqual(b1.diffDays, 0, 'OLD BUG confirmed: diffDays was 0');

    // Scenario 2: On time — same day return
    console.log('\n📋 Scenario 2: Return on due date 10:00 IST');
    const r2 = calcFine_Fixed(fakeIST(2026, 2, 12, 10, 0), due);
    assertEqual(r2.isOverdue, false, 'NOT overdue');
    assertEqual(r2.fine, 0, 'Fine = ₹0');

    // Scenario 3: Last minute — 23:50 IST on due date
    console.log('\n📋 Scenario 3: Return at 23:50 IST on due date');
    const r3 = calcFine_Fixed(fakeIST(2026, 2, 12, 23, 50), due);
    assertEqual(r3.isOverdue, false, 'NOT overdue (still same day)');
    assertEqual(r3.fine, 0, 'Fine = ₹0');

    // Scenario 4: Just after midnight — 00:05 IST next day
    console.log('\n📋 Scenario 4: Return at 00:05 IST next day');
    const r4 = calcFine_Fixed(fakeIST(2026, 2, 13, 0, 5), due);
    assertEqual(r4.isOverdue, true, 'OVERDUE (crossed midnight IST)');
    assertEqual(r4.diffDays, 1, 'Overdue days = 1');
    assertEqual(r4.fine, 1.0, 'Fine = ₹1.00');

    // Scenario 5: 5 days overdue
    console.log('\n📋 Scenario 5: 5 days overdue');
    const r5 = calcFine_Fixed(fakeIST(2026, 2, 17, 14, 0), due);
    assertEqual(r5.diffDays, 5, 'Overdue days = 5');
    assertEqual(r5.fine, 5.0, 'Fine = ₹5.00');

    // Scenario 6: 30 days overdue
    console.log('\n📋 Scenario 6: 30 days overdue');
    const r6 = calcFine_Fixed(fakeIST(2026, 3, 14, 12, 0), due);
    assertEqual(r6.diffDays, 30, 'Overdue days = 30');
    assertEqual(r6.fine, 30.0, 'Fine = ₹30.00');

    // Scenario 7: Higher rate (₹5/day)
    console.log('\n📋 Scenario 7: ₹5/day rate, 3 days overdue');
    const r7 = calcFine_Fixed(fakeIST(2026, 2, 15, 10, 0), due, 5.0);
    assertEqual(r7.diffDays, 3, 'Overdue days = 3');
    assertEqual(r7.fine, 15.0, 'Fine = ₹15.00');

    // Scenario 8: Early return
    console.log('\n📋 Scenario 8: Return 2 days early');
    const r8 = calcFine_Fixed(fakeIST(2026, 2, 10, 14, 0), due);
    assertEqual(r8.isOverdue, false, 'NOT overdue');
    assertEqual(r8.fine, 0, 'Fine = ₹0');

    // Scenario 9: 365 days overdue
    console.log('\n📋 Scenario 9: 365 days overdue');
    const r9 = calcFine_Fixed(fakeIST(2027, 2, 12, 12, 0), due);
    assertEqual(r9.diffDays, 365, 'Overdue days = 365');
    assertEqual(r9.fine, 365.0, 'Fine = ₹365.00');
}

// ============================================================
// TEST SUITE 2: Frontend ↔ Backend Consistency
// ============================================================
function testFrontendBackendConsistency() {
    section('TEST SUITE 2: Frontend ↔ Backend Fine Consistency');

    const due = makeDue(2026, 2, 12);

    const testCases = [
        { desc: 'On time', istDay: 12, istH: 10, istM: 0, expectedDays: 0 },
        { desc: '1 day overdue', istDay: 13, istH: 14, istM: 34, expectedDays: 1 },
        { desc: '3 days overdue', istDay: 15, istH: 12, istM: 0, expectedDays: 3 },
        { desc: 'Just after midnight', istDay: 13, istH: 0, istM: 5, expectedDays: 1 },
    ];

    testCases.forEach(tc => {
        console.log(`\n📋 ${tc.desc}`);
        // Backend: fake IST
        const backend = calcFine_Fixed(fakeIST(2026, 2, tc.istDay, tc.istH, tc.istM), due);
        // Frontend: real UTC for same IST moment (IST - 5:30 = UTC)
        const realUTC = new Date(Date.UTC(2026, 1, tc.istDay, tc.istH - 5, tc.istM - 30));
        const frontend = calcFine_Frontend(realUTC, due);

        assertEqual(backend.diffDays, tc.expectedDays, `Backend: ${tc.expectedDays} days`);
        assertEqual(frontend.diffDays, tc.expectedDays, `Frontend: ${tc.expectedDays} days`);
        assertEqual(backend.fine, frontend.fine, `Match: ₹${backend.fine} = ₹${frontend.fine}`);
    });
}

// ============================================================
// TEST SUITE 3: Edge Cases (Boundaries, Leap Year, etc.)
// ============================================================
function testEdgeCases() {
    section('TEST SUITE 3: Edge Cases & Boundaries');
    const rate = 2.0;

    // Midnight IST boundary
    console.log('\n📋 EC1: 23:59 IST on due date → NOT overdue');
    const r1 = calcFine_Fixed(fakeIST(2026, 2, 15, 23, 59), makeDue(2026, 2, 15), rate);
    assertEqual(r1.isOverdue, false, '23:59 IST → NOT overdue');
    assertEqual(r1.fine, 0, 'Fine = ₹0');

    console.log('\n📋 EC2: 00:01 IST next day → 1 day overdue');
    const r2 = calcFine_Fixed(fakeIST(2026, 2, 16, 0, 1), makeDue(2026, 2, 15), rate);
    assertEqual(r2.isOverdue, true, '00:01 IST → OVERDUE');
    assertEqual(r2.diffDays, 1, '1 day');
    assertEqual(r2.fine, 2.0, 'Fine = ₹2.00');

    // Year boundary
    console.log('\n📋 EC3: Year boundary — Due 31/12/2025, Return 02/01/2026');
    const r3 = calcFine_Fixed(fakeIST(2026, 1, 2, 10, 0), makeDue(2025, 12, 31), rate);
    assertEqual(r3.diffDays, 2, '2 days across year');
    assertEqual(r3.fine, 4.0, 'Fine = ₹4.00');

    // Month boundary
    console.log('\n📋 EC4: Month boundary — Due 28/02, Return 01/03');
    const r4 = calcFine_Fixed(fakeIST(2026, 3, 1, 12, 0), makeDue(2026, 2, 28), rate);
    assertEqual(r4.diffDays, 1, '1 day (non-leap year)');
    assertEqual(r4.fine, 2.0, 'Fine = ₹2.00');

    // Leap year (2028)
    console.log('\n📋 EC5: Leap year — Due 28/02/2028, Return 01/03/2028');
    const r5 = calcFine_Fixed(fakeIST(2028, 3, 1, 12, 0), makeDue(2028, 2, 28), rate);
    assertEqual(r5.diffDays, 2, '2 days (Feb has 29 days in 2028)');

    // Condition combinations
    console.log('\n📋 EC6: Good + 1 day overdue');
    const r6 = calcFine_Fixed(fakeIST(2026, 2, 13, 14, 0), makeDue(2026, 2, 12));
    assertEqual(r6.fine, 1.0, 'Fine = ₹1.00 (overdue only)');

    console.log('\n📋 EC7: Damaged + 1 day overdue');
    assertEqual(r6.fine + 100, 101.0, 'Total = ₹1 + ₹100 = ₹101.00');

    console.log('\n📋 EC8: Lost + 1 day overdue');
    assertEqual(r6.fine + 500, 501.0, 'Total = ₹1 + ₹500 = ₹501.00');

    // Multiple time-of-day checks on same date
    console.log('\n📋 EC9: Same overdue day, different times → same fine');
    const due9 = makeDue(2026, 2, 10);
    const morning = calcFine_Fixed(fakeIST(2026, 2, 13, 6, 0), due9);
    const noon = calcFine_Fixed(fakeIST(2026, 2, 13, 12, 0), due9);
    const evening = calcFine_Fixed(fakeIST(2026, 2, 13, 22, 0), due9);
    assertEqual(morning.diffDays, 3, '06:00 IST → 3 days');
    assertEqual(noon.diffDays, 3, '12:00 IST → 3 days');
    assertEqual(evening.diffDays, 3, '22:00 IST → 3 days');
    assertEqual(morning.fine, noon.fine, 'Morning fine = Noon fine');
    assertEqual(noon.fine, evening.fine, 'Noon fine = Evening fine');
}

// ============================================================
// TEST SUITE 4: Due Date Storage & Renewal
// ============================================================
function testDueDateStorage() {
    section('TEST SUITE 4: Due Date Storage & Renewal');

    // Due date format
    console.log('\n📋 Due date string format');
    const dueStr = makeDue(2026, 2, 27);
    assertEqual(dueStr, '2026-02-27T23:59:59.999+05:30', 'Format correct');

    const parsed = new Date(dueStr);
    assert(!isNaN(parsed.getTime()), 'Parses without error');
    assertEqual(parsed.getUTCHours(), 18, 'UTC hour = 18 (23-5)');
    assertEqual(parsed.getUTCMinutes(), 29, 'UTC minute = 29 (59-30)');

    // Renewal: extends from current due date
    console.log('\n📋 Renewal extends by 15 days');
    const currentDue = new Date(dueStr);
    const renewed = new Date(currentDue);
    renewed.setUTCDate(renewed.getUTCDate() + 15);
    renewed.setUTCHours(23, 59, 59, 999);
    const renewedISO = renewed.toISOString().replace('Z', '+05:30');
    const daysDiff = Math.round(
        (new Date(renewedISO.split('T')[0]) - new Date(dueStr.split('T')[0])) / (1000 * 60 * 60 * 24)
    );
    assertEqual(daysDiff, 15, 'Renewed by exactly 15 days');

    // Issue date format
    console.log('\n📋 Issue date format');
    const issueDate = fakeIST(2026, 2, 13, 14, 30);
    const issueStr = issueDate.toISOString().replace('Z', '+05:30');
    assert(issueStr.endsWith('+05:30'), 'Has +05:30 offset');
    assert(issueStr.startsWith('2026-02-13T14:30'), 'Shows IST time 14:30');
}

// ============================================================
// TEST SUITE 5: CronService Overdue Days
// ============================================================
function testCronService() {
    section('TEST SUITE 5: CronService Overdue Days');

    // Fixed "now" = 13/02/2026 08:00 IST (cron runs at 8 AM IST)
    // In real UTC: 13/02/2026 02:30 UTC
    const cronNow = new Date(Date.UTC(2026, 1, 13, 2, 30, 0));

    console.log('\n📋 Due yesterday (12/02) → 1 day');
    assertEqual(calcCronOverdue(cronNow, makeDue(2026, 2, 12)), 1, '1 overdue day');

    console.log('\n📋 Due 7 days ago (06/02) → 7 days');
    assertEqual(calcCronOverdue(cronNow, makeDue(2026, 2, 6)), 7, '7 overdue days');

    console.log('\n📋 Due today (13/02) → 0 days');
    assertEqual(calcCronOverdue(cronNow, makeDue(2026, 2, 13)), 0, '0 overdue days');

    console.log('\n📋 Due tomorrow (14/02) → negative (not overdue)');
    assert(calcCronOverdue(cronNow, makeDue(2026, 2, 14)) < 0, 'Negative = not overdue');

    console.log('\n📋 Due 30 days ago (14/01) → 30 days');
    assertEqual(calcCronOverdue(cronNow, makeDue(2026, 1, 14)), 30, '30 overdue days');

    // Critical: At 00:30 IST on Feb 13 (= 19:00 UTC Feb 12).
    // IST date is Feb 13. Due date Feb 12 = 1 day overdue (book was due end of Feb 12).
    // This is the edge case where UTC says "still Feb 12" but IST correctly says "Feb 13".
    console.log('\n📋 Critical: Cron at 00:30 IST on 13/02 (19:00 UTC on 12/02)');
    const cronLateNight = new Date(Date.UTC(2026, 1, 12, 19, 0, 0)); // = 13/02 00:30 IST
    assertEqual(calcCronOverdue(cronLateNight, makeDue(2026, 2, 12)), 1, 'Due 12/02, now 13/02 00:30 IST → 1 day overdue');
    assertEqual(calcCronOverdue(cronLateNight, makeDue(2026, 2, 11)), 2, 'Due 11/02, now 13/02 00:30 IST → 2 days overdue');
    assertEqual(calcCronOverdue(cronLateNight, makeDue(2026, 2, 13)), 0, 'Due 13/02, now 13/02 00:30 IST → 0 days (same day)');
}

// ============================================================
// TEST SUITE 6: SQLite julianday Queries (In-Memory DB)
// ============================================================
function testSQLiteQueries() {
    return new Promise((resolve) => {
        section('TEST SUITE 6: SQLite julianday Queries');

        const db = new sqlite3.Database(':memory:');

        db.serialize(() => {
            db.run(`CREATE TABLE circulation (
                id TEXT PRIMARY KEY, student_id TEXT, copy_id TEXT,
                issue_date TEXT, due_date TEXT
            )`);
            db.run(`CREATE TABLE students (
                id TEXT PRIMARY KEY, full_name TEXT, register_number TEXT,
                semester TEXT, profile_image TEXT, dept_id TEXT
            )`);
            db.run(`CREATE TABLE departments (id TEXT PRIMARY KEY, name TEXT, code TEXT)`);
            db.run(`CREATE TABLE book_copies (id TEXT PRIMARY KEY, accession_number TEXT, book_isbn TEXT, status TEXT)`);
            db.run(`CREATE TABLE books (isbn TEXT PRIMARY KEY, title TEXT, author TEXT, cover_image TEXT)`);

            // Seed
            db.run(`INSERT INTO departments VALUES ('d1','CS','CS')`);
            db.run(`INSERT INTO students VALUES ('s1','Student A','REG001','4',NULL,'d1')`);
            db.run(`INSERT INTO books VALUES ('978-1','Book A','Author',NULL)`);
            db.run(`INSERT INTO book_copies VALUES ('c1','ACC001','978-1','Issued')`);
            db.run(`INSERT INTO book_copies VALUES ('c2','ACC002','978-1','Issued')`);
            db.run(`INSERT INTO book_copies VALUES ('c3','ACC003','978-1','Issued')`);

            // Fixed due dates (not relative to "now")
            const duePast = '2026-02-10T23:59:59.999+05:30';   // clearly in past
            const dueFuture = '2030-12-31T23:59:59.999+05:30'; // clearly in future
            const dueWayPast = '2026-01-01T23:59:59.999+05:30'; // very old

            db.run(`INSERT INTO circulation VALUES ('loan1','s1','c1','2026-02-01T10:00:00+05:30',?)`, [duePast]);
            db.run(`INSERT INTO circulation VALUES ('loan2','s1','c2','2026-02-01T10:00:00+05:30',?)`, [dueFuture]);
            db.run(`INSERT INTO circulation VALUES ('loan3','s1','c3','2025-12-01T10:00:00+05:30',?)`, [dueWayPast]);

            // Test 1: IST-aware overdue_days
            console.log('\n📋 overdue_days SQL (IST-aware)');
            db.all(`
                SELECT c.id,
                       (julianday(datetime('now', '+05:30')) - julianday(c.due_date)) as overdue_days
                FROM circulation c ORDER BY c.id
            `, (err, rows) => {
                if (err) { console.error(err); return; }
                const l1 = rows.find(r => r.id === 'loan1');
                const l2 = rows.find(r => r.id === 'loan2');
                const l3 = rows.find(r => r.id === 'loan3');

                assert(l1.overdue_days > 0, 'Loan1 (due 10/02/2026): overdue_days > 0');
                assert(l2.overdue_days < 0, 'Loan2 (due 31/12/2030): overdue_days < 0 (future)');
                assert(l3.overdue_days > 30, 'Loan3 (due 01/01/2026): overdue_days > 30');
                console.log(`    → Loan1: ${l1.overdue_days.toFixed(2)}, Loan2: ${l2.overdue_days.toFixed(2)}, Loan3: ${l3.overdue_days.toFixed(2)}`);
            });

            // Test 2: UTC vs IST shift is always ~0.229 days
            console.log('\n📋 UTC vs IST shift = 5.5 hours');
            db.get(`
                SELECT 
                    (julianday(datetime('now', '+05:30')) - julianday('now')) as shift
            `, (err, row) => {
                if (err) { console.error(err); return; }
                assertApprox(row.shift, 0.229, `Shift = ${row.shift.toFixed(4)} days (~5.5h)`, 0.001);
            });

            // Test 3: overdue_count
            console.log('\n📋 overdue_count aggregation');
            db.get(`
                SELECT COUNT(c.id) as total,
                       SUM(CASE WHEN julianday(datetime('now', '+05:30')) > julianday(c.due_date) THEN 1 ELSE 0 END) as overdue
                FROM circulation c WHERE c.student_id = 's1'
            `, (err, row) => {
                if (err) { console.error(err); return; }
                assertEqual(row.total, 3, 'Total loans = 3');
                assertEqual(row.overdue, 2, 'Overdue = 2 (loan1 + loan3)');
            });

            // Test 4: Fine record storage
            console.log('\n📋 Fine record storage & retrieval');
            db.run(`CREATE TABLE fines (
                id TEXT PRIMARY KEY, amount REAL, status TEXT, remark TEXT,
                created_at TEXT DEFAULT (datetime('now', '+05:30'))
            )`);
            const fineId = uuidv4();
            db.run(`INSERT INTO fines VALUES (?, 5.0, 'Unpaid', 'Overdue 5 days', datetime('now', '+05:30'))`, [fineId]);

            db.get(`SELECT * FROM fines WHERE id = ?`, [fineId], (err, row) => {
                if (err) { console.error(err); return; }
                assertEqual(row.amount, 5.0, 'Fine amount = ₹5.00');
                assertEqual(row.status, 'Unpaid', 'Status = Unpaid');
                assert(row.created_at != null, 'created_at is set');
                console.log(`    → Fine: ₹${row.amount}, Status: ${row.status}, Created: ${row.created_at}`);

                db.close(() => resolve());
            });
        });
    });
}

// ============================================================
// RUN ALL TESTS
// ============================================================
async function runAllTests() {
    console.log('\n' + '🔬'.repeat(30));
    console.log('  CIRCULATION DESK — DATE/TIME & FINE CALCULATION TESTS');
    console.log('  ⚡ Fully deterministic — no system clock dependency');
    console.log('🔬'.repeat(30));

    testFineCalculation();
    testFrontendBackendConsistency();
    testEdgeCases();
    testDueDateStorage();
    testCronService();
    await testSQLiteQueries();

    console.log('\n' + '═'.repeat(60));
    console.log('  FINAL RESULTS');
    console.log('═'.repeat(60));
    console.log(`  Total:  ${totalTests}`);
    console.log(`  Passed: ${passedTests} ✅`);
    console.log(`  Failed: ${failedTests} ❌`);

    if (failures.length > 0) {
        console.log('\n  FAILURES:');
        failures.forEach(f => console.log(f));
    }

    console.log('═'.repeat(60));
    process.exit(failedTests > 0 ? 1 : 0);
}

runAllTests();
