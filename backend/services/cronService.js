const cron = require('node-cron');
const db = require('../db');
const emailService = require('./emailService');
const { v4: uuidv4 } = require('uuid');
const { getISTDate, getSQLiteISTTimestamp, getISTISOWithOffset } = require('../utils/dateUtils');

// Scheduled Task: Check Overdue Books (Daily at 8:00 AM)
cron.schedule('0 8 * * *', () => {
    console.log('[Cron] Triggered Daily Overdue Check Schedule...');
    checkOverdueNotices();
});

const checkOverdueNotices = () => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    db.get("SELECT value FROM system_settings WHERE key = 'last_overdue_notice_sent'", (err, row) => {
        if (err) {
            console.error('[Cron] Error checking overdue notice status:', err);
            return;
        }

        const lastSent = row ? row.value : null;

        if (lastSent !== today) {
            console.log('[Cron] Starting Overdue Notice Process...');
            runOverdueCheck(today);
        } else {
            console.log('[Cron] Overdue notices already sent today. Skipping.');
        }
    });
};

const runOverdueCheck = async (todayMarker) => {
    try {
        // 1. Get Active Overdue Loans
        // Group by Student to send one email per student
        const nowISO = getISTISOWithOffset();

        db.all(`
            SELECT c.id, c.student_id, c.due_date, b.title as book_title, s.full_name as student_name, s.email
            FROM circulation c
            JOIN book_copies bc ON c.copy_id = bc.id
            JOIN books b ON bc.book_isbn = b.isbn
            JOIN students s ON c.student_id = s.id
            WHERE c.due_date < ?
        `, [nowISO], async (err, rows) => {
            if (err) {
                console.error('[Cron] Error fetching overdue loans:', err);
                return;
            }

            // MARK AS SENT regardless of finding books, to avoid repeated checks on empty days
            db.run("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('last_overdue_notice_sent', ?)", [todayMarker]);

            if (rows.length === 0) {
                console.log('[Cron] No overdue books found today.');
                return;
            }

            // Group by Student
            const studentLoans = {};
            rows.forEach(row => {
                if (!studentLoans[row.student_id]) {
                    studentLoans[row.student_id] = {
                        student: { name: row.student_name, email: row.email },
                        loans: []
                    };
                }

                // Normalize to IST date-only for accurate day difference
                const istOffset = 5.5 * 60 * 60 * 1000;
                const nowIST = new Date(new Date().getTime() + istOffset);
                const dueDateParsed = new Date(row.due_date);
                const dueDateIST = new Date(dueDateParsed.getTime() + istOffset);
                const nowDateStr = nowIST.toISOString().split('T')[0];
                const dueDateStr = dueDateIST.toISOString().split('T')[0];
                const overdueDays = Math.ceil((new Date(nowDateStr) - new Date(dueDateStr)) / (1000 * 60 * 60 * 24));

                studentLoans[row.student_id].loans.push({
                    book_title: row.book_title,
                    due_date: row.due_date,
                    overdue_days: overdueDays
                });
            });

            // Send Emails
            console.log(`[Cron] Found ${Object.keys(studentLoans).length} students with overdue books.`);

            let emailsSent = 0;
            for (const studentId in studentLoans) {
                const data = studentLoans[studentId];
                if (data.student.email) {
                    await emailService.sendOverdueNotice(data.student, data.loans);
                    emailsSent++;
                }
            }

            console.log('[Cron] Overdue check completed.');

            // Audit Log for System Action
            if (emailsSent > 0) {
                const auditId = uuidv4();
                const logQuery = `INSERT INTO audit_logs (id, module, action_type, description, actor_id, actor_role, timestamp) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+05:30'))`;
                db.run(logQuery, [auditId, 'System', 'OVERDUE_CHECK', `Sent overdue notices to ${emailsSent} students`, 'SYSTEM', 'System']);
            }
        });

    } catch (error) {
        console.error('[Cron] Unexpected error:', error);
    }
};

// Scheduled Task: Cloud Backup (Daily at Midnight)
cron.schedule('0 0 * * *', async () => {
    console.log('[Cron] Checking Cloud Backup schedule...');
    const cloudBackupService = require('./cloudBackupService');

    // Get Config
    db.get("SELECT value FROM system_settings WHERE key = 'backup_config'", async (err, row) => {
        if (!err && row) {
            try {
                const config = JSON.parse(row.value);
                if (config.autoBackup && config.connectionUri) {
                    // Check frequency
                    if (config.frequency === 'on_close') {
                        console.log('[Cron] Backup frequency set to "on_close". Skipping daily schedule.');
                        return;
                    }

                    if (config.frequency === 'weekly') {
                        const day = new Date().getDay(); // 0 = Sunday
                        if (day !== 0) {
                            console.log('[Cron] Weekly backup active. Today is not Sunday. Skipping.');
                            return;
                        }
                    }

                    console.log('[Cron] Starting Auto-Backup to Cloud...');
                    await cloudBackupService.performCloudBackup();
                }
            } catch (e) {
                console.error('[Cron] Error parsing backup config:', e);
            }
        }
    });
});

module.exports = {
    init: () => {
        console.log('[Cron] Service Initialized');
        // Check for overdue notices on startup (Run once per day)
        checkOverdueNotices();
    }
};
