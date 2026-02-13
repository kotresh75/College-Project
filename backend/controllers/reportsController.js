const db = require('../db');

// Helper to run query as promise
const runQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// Helper to get SQLite date modifier from period string
const getDateModifier = (period = '30days') => {
    switch (period) {
        case '1days': return '-1 days';
        case '7days': return '-7 days';
        case '30days': return '-30 days';
        case '90days': return '-90 days';
        case '365days': return '-365 days';
        default: return '-30 days';
    }
};

exports.getCirculationStats = async (req, res) => {
    try {
        const { period } = req.query; // e.g. '7days', '30days'
        const dateMod = getDateModifier(period);

        // 1. Summary Counts
        // Active Issues: Snapshot (Currently in circulation, regardless of when issued)
        const activeIssuesSql = "SELECT COUNT(*) as count FROM circulation";

        // Period Returns: Completed transactions within the selected period
        const periodReturnsSql = `SELECT COUNT(*) as count FROM transaction_logs WHERE action_type = 'RETURN' AND timestamp >= date('now', '${dateMod}')`;

        // Overdue Items: Snapshot (Currently overdue)
        const overdueSql = "SELECT COUNT(*) as count FROM circulation WHERE date(due_date) < date('now')";

        const activeIssued = await runQuery(activeIssuesSql);
        const periodReturns = await runQuery(periodReturnsSql);
        const activeOverdue = await runQuery(overdueSql);

        // 2. Trend Chart (Selected Period)
        const dailyTrendSql = `
            SELECT date(timestamp) as date, action_type, COUNT(*) as count 
            FROM transaction_logs 
            WHERE timestamp >= date('now', '${dateMod}')
            AND action_type IN ('ISSUE', 'RETURN')
            GROUP BY date(timestamp), action_type
            ORDER BY date(timestamp)
        `;
        const trendRaw = await runQuery(dailyTrendSql);

        const trendMap = {};
        trendRaw.forEach(row => {
            if (!trendMap[row.date]) trendMap[row.date] = { date: row.date, issue: 0, return: 0 };
            if (row.action_type === 'ISSUE') trendMap[row.date].issue = row.count;
            if (row.action_type === 'RETURN') trendMap[row.date].return = row.count;
        });
        const trend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

        // 3. Top Borrowed Books (Selected Period)
        const topBooksSql = `
            SELECT b.title, COUNT(t.id) as count
            FROM transaction_logs t
            JOIN book_copies bc ON t.copy_id = bc.id
            JOIN books b ON bc.book_isbn = b.isbn
            WHERE t.action_type = 'ISSUE'
            AND t.timestamp >= date('now', '${dateMod}')
            GROUP BY b.title
            ORDER BY count DESC
            LIMIT 5
        `;
        const topBooks = await runQuery(topBooksSql);

        res.json({
            summary: {
                active_issued: activeIssued[0].count,
                monthly_returns: periodReturns[0].count, // Kept key as 'monthly_returns' for frontend compatibility, but value is dynamic
                active_overdue: activeOverdue[0].count
            },
            trend,
            top_books: topBooks
        });
    } catch (err) {
        console.error("Circulation Report Error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.getFinancialStats = async (req, res) => {
    try {
        const { period } = req.query;
        const dateMod = getDateModifier(period);

        // 1. Financial Summary
        // Collected: In the selected period
        const collectedSql = `SELECT SUM(amount) as total FROM fines WHERE status = 'Paid' AND payment_date >= date('now', '${dateMod}')`;

        // Pending: Snapshot (Currently Unpaid - All Time)
        const pendingSql = "SELECT SUM(amount) as total FROM fines WHERE status = 'Unpaid'";

        // Waived: In the selected period (Assuming we track waiver date, using payment_date or similar if available, else updated_at?)
        // Assuming 'payment_date' is set when status becomes 'Waived' or similar mechanism. fallback to same logic.
        const waivedSql = `SELECT SUM(amount) as total FROM fines WHERE status = 'Waived' AND payment_date >= date('now', '${dateMod}')`;

        const collected = await runQuery(collectedSql);
        const pending = await runQuery(pendingSql);
        const waived = await runQuery(waivedSql);

        // 2. Daily Collection Trend (Selected Period)
        const dailyCollectionSql = `
            SELECT date(payment_date) as date, SUM(amount) as total
            FROM fines
            WHERE status IN ('Paid', 'Waived') 
            AND payment_date >= date('now', '${dateMod}')
            GROUP BY date(payment_date)
            ORDER BY date(payment_date)
        `;
        const trend = await runQuery(dailyCollectionSql);

        res.json({
            summary: {
                collected: collected[0].total || 0,
                pending: pending[0].total || 0,
                waived: waived[0].total || 0
            },
            trend
        });
    } catch (err) {
        console.error("Financial Report Error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.getInventoryStats = async (req, res) => {
    try {
        // 1. Base Counts
        const totalBooks = await runQuery("SELECT COUNT(*) as count FROM books");
        const totalCopies = await runQuery("SELECT COUNT(*) as count FROM book_copies");
        const totalValue = await runQuery("SELECT SUM(price) as total FROM books"); // Approximate value if price is in 'books'
        // Note: If price is per copy, we'd need to join or assume. Assuming 'price' is in books schema per title.

        // 2. Distribution by Department
        const byDeptSql = `
            SELECT d.name, COUNT(bc.id) as count 
            FROM book_copies bc
            JOIN books b ON bc.book_isbn = b.isbn
            JOIN departments d ON b.dept_id = d.id 
            GROUP BY d.name
        `;
        const byDept = await runQuery(byDeptSql);

        // 3. Status Dist
        const byStatusSql = `
            SELECT status, COUNT(*) as count 
            FROM book_copies 
            GROUP BY status
        `;
        const byStatus = await runQuery(byStatusSql);

        res.json({
            summary: {
                titles: totalBooks[0].count,
                volumes: totalCopies[0].count,
                estimated_value: totalValue[0]?.total || 0
            },
            distribution: {
                department: byDept,
                status: byStatus
            }
        });
    } catch (err) {
        console.error("Inventory Report Error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.getDailySummary = async (req, res) => {
    try {
        const { period } = req.query;
        const dateMod = getDateModifier(period);

        // 1. Transaction Stats (Issues & Returns) by Date
        const transSql = `
            SELECT 
                date(timestamp) as date,
                SUM(CASE WHEN action_type = 'ISSUE' THEN 1 ELSE 0 END) as issues,
                SUM(CASE WHEN action_type = 'RETURN' THEN 1 ELSE 0 END) as returns
            FROM transaction_logs
            WHERE timestamp >= date('now', '${dateMod}')
            GROUP BY date(timestamp)
        `;
        const transRows = await runQuery(transSql);

        // 2. Fines Collected by Date
        const fineSql = `
            SELECT 
                date(payment_date) as date,
                SUM(amount) as collected
            FROM fines
            WHERE status IN ('Paid', 'Waived')
            AND payment_date >= date('now', '${dateMod}')
            GROUP BY date(payment_date)
        `;
        const fineRows = await runQuery(fineSql);

        // 3. Merge Data
        const mergedData = {};

        const initDate = (d) => {
            if (!mergedData[d]) mergedData[d] = { date: d, issues: 0, returns: 0, fines: 0 };
        };

        transRows.forEach(row => {
            initDate(row.date);
            mergedData[row.date].issues = row.issues;
            mergedData[row.date].returns = row.returns;
        });

        fineRows.forEach(row => {
            initDate(row.date);
            mergedData[row.date].fines = row.collected;
        });

        // Convert to array and sort DESC (newest first)
        const dailyData = Object.values(mergedData).sort((a, b) => b.date.localeCompare(a.date));

        // 4. Calculate Totals
        const totals = dailyData.reduce((acc, curr) => ({
            issues: acc.issues + curr.issues,
            returns: acc.returns + curr.returns,
            fines: acc.fines + curr.fines
        }), { issues: 0, returns: 0, fines: 0 });

        // 5. Snapshots (Quick Stats)
        const activeIssuesSnap = await runQuery("SELECT COUNT(*) as count FROM circulation");
        const overdueSnap = await runQuery("SELECT COUNT(*) as count FROM circulation WHERE date(due_date) < date('now')");
        const totalBooksSnap = await runQuery("SELECT COUNT(*) as count FROM book_copies"); // Total Volumes
        const totalMembersSnap = await runQuery("SELECT COUNT(*) as count FROM students"); // Total Students

        res.json({
            data: dailyData,
            totals,
            snapshots: {
                active_issues: activeIssuesSnap[0].count,
                overdue_books: overdueSnap[0].count,
                total_books: totalBooksSnap[0].count,
                total_members: totalMembersSnap[0].count
            }
        });

    } catch (err) {
        console.error("Daily Summary Report Error:", err);
        res.status(500).json({ error: err.message });
    }
};
