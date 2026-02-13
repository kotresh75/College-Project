const db = require('../db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const emailService = require('../services/emailService');
const auditService = require('../services/auditService');
const socketService = require('../services/socketService');
const { getISTISOWithOffset } = require('../utils/dateUtils');

// GET /api/admins
exports.getAdmins = (req, res) => {
    // Exclude password_hash; mark the earliest-created admin as 'founder'
    const query = `
        SELECT id, name, email, phone, status, last_login, created_at,
            CASE WHEN created_at = (SELECT MIN(created_at) FROM admins) THEN 1 ELSE 0 END as is_founder
        FROM admins ORDER BY created_at DESC`;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

// POST /api/admins
exports.createAdmin = (req, res) => {
    const { name, email, phone } = req.body;

    if (!name || !email) return res.status(400).json({ error: "Name and Email are required" });

    // Default password for new admins (Should be changed on first login)
    const defaultPassword = "password123";
    const saltRounds = 10;

    bcrypt.hash(defaultPassword, saltRounds, (err, hash) => {
        if (err) return res.status(500).json({ error: "Encryption error" });

        const id = uuidv4();
        const query = `INSERT INTO admins (id, name, email, phone, password_hash, status) VALUES (?, ?, ?, ?, ?, 'Active')`;

        db.run(query, [id, name, email, phone, hash], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE')) return res.status(409).json({ error: "Email already exists" });
                return res.status(500).json({ error: err.message });
            }

            auditService.log(req.user, 'CREATE', 'Admin Management', `Created new admin: ${name} (${email})`, { new_admin_id: id });
            socketService.emit('admin_update', { type: 'CREATE', id });
            res.json({ message: "Admin created successfully", id });
        });
    });
};

// PUT /api/admins/:id
exports.updateAdmin = (req, res) => {
    const { id } = req.params;
    const { name, phone } = req.body;

    const query = `UPDATE admins SET name = ?, phone = ?, updated_at = datetime('now', '+05:30') WHERE id = ?`;
    db.run(query, [name, phone, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Admin not found" });
        socketService.emit('admin_update', { type: 'UPDATE', id });
        auditService.log(req.user, 'UPDATE', 'Admin Management', `Updated admin details: ${name}`, { target_id: id });
        res.json({ message: "Admin updated successfully" });
    });
};

// PATCH /api/admins/:id/status
exports.toggleStatus = (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'Active' or 'Disabled'

    if (!['Active', 'Disabled'].includes(status)) return res.status(400).json({ error: "Invalid status" });

    db.get("SELECT email FROM admins WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Admin not found" });

        // Prevent disabling the last active admin
        if (status === 'Disabled') {
            db.get("SELECT COUNT(*) as count FROM admins WHERE status = 'Active'", (err, countRow) => {
                if (err) return res.status(500).json({ error: err.message });
                if (countRow.count <= 1) {
                    return res.status(403).json({ error: "Cannot disable the last active admin. Create another admin first." });
                }
                doUpdate();
            });
        } else {
            doUpdate();
        }

        function doUpdate() {
            const query = `UPDATE admins SET status = ?, updated_at = datetime('now', '+05:30') WHERE id = ?`;
            db.run(query, [status, id], function (err) {
                if (err) return res.status(500).json({ error: err.message });

                auditService.log(req.user, 'STATUS_CHANGE', 'Admin Management', `Changed status of ${row.email} to ${status}`, { target_id: id, new_status: status });
                socketService.emit('admin_update', { type: 'UPDATE', id });
                res.json({ message: `Admin ${status}` });
            });
        }
    });
};

// DELETE /api/admins/:id
exports.deleteAdmin = (req, res) => {
    const { id } = req.params;

    db.get("SELECT email FROM admins WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Admin not found" });

        // Prevent deleting the last admin
        db.get("SELECT COUNT(*) as count FROM admins", (err, countRow) => {
            if (err) return res.status(500).json({ error: err.message });
            if (countRow.count <= 1) {
                return res.status(403).json({ error: "Cannot delete the last admin. Create another admin first." });
            }

            const query = `DELETE FROM admins WHERE id = ?`;
            db.run(query, [id], function (err) {
                if (err) return res.status(500).json({ error: err.message });

                auditService.log(req.user, 'DELETE', 'Admin Management', `Deleted admin: ${row.email}`, { target_id: id });
                socketService.emit('admin_update', { type: 'DELETE', id });
                res.json({ message: "Admin deleted successfully" });
            });
        });
    });
};

// POST /api/admins/:id/reset-password
exports.resetPassword = (req, res) => {
    const { id } = req.params;
    const actorId = req.user ? req.user.id : 'SYSTEM';
    const actorRole = req.user ? req.user.role : 'System';

    // In a real app, this sends an email. Here we reset to default.
    const defaultPassword = "password123";
    const saltRounds = 10;

    bcrypt.hash(defaultPassword, saltRounds, (err, hash) => {
        if (err) return res.status(500).json({ error: "Encryption error" });

        db.run("UPDATE admins SET password_hash = ? WHERE id = ?", [hash, id], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            auditService.log(req.user, 'RESET_PASSWORD', 'Admin Management', `Reset password for admin ID: ${id}`, { target_id: id });
            socketService.emit('admin_update', { type: 'UPDATE', id });
            res.json({ message: "Password reset to 'password123'" });
        });
    });
};

// GET /api/admins/:id/logs (Audit Logs for specific admin actions)
exports.getAdminLogs = (req, res) => {
    const { id } = req.params;
    const query = `SELECT * FROM audit_logs WHERE actor_id = ? ORDER BY timestamp DESC LIMIT 50`;
    db.all(query, [id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

// Broadcast Message
exports.broadcastMessage = async (req, res) => {
    const { subject, message, recipient_group } = req.body;
    const actorId = req.user ? req.user.id : 'SYSTEM';

    if (!subject || !message || !recipient_group) {
        return res.status(400).json({ error: "Subject, message, and recipient group are required" });
    }

    try {
        let recipients = [];
        // Fetch Recipients
        // Fetch Recipients
        if (recipient_group === 'Students' || recipient_group === 'All') {
            const students = await new Promise((resolve, reject) => {
                db.all("SELECT full_name as name, email FROM students WHERE status = 'Active'", [], (err, rows) => err ? reject(err) : resolve(rows));
            });
            recipients = [...recipients, ...students];
        }

        if (recipient_group === 'Staff' || recipient_group === 'All') {
            const staff = await new Promise((resolve, reject) => {
                db.all("SELECT name, email FROM staff WHERE status = 'Active'", [], (err, rows) => err ? reject(err) : resolve(rows));
            });
            recipients = [...recipients, ...staff];
        }

        // Handle Department Targeting
        if (recipient_group.startsWith('Dept:')) {
            const deptVal = recipient_group.split(':')[1];
            const students = await new Promise((resolve, reject) => {
                // Check only dept_id (Schema validation confirmed 'department' column does not exist)
                db.all("SELECT full_name as name, email FROM students WHERE status = 'Active' AND dept_id = ?", [deptVal], (err, rows) => err ? reject(err) : resolve(rows));
            });
            recipients = [...recipients, ...students];
        }

        // Handle Individual Student Targeting
        if (recipient_group.startsWith('Student:')) {
            const queryVal = recipient_group.split(':')[1];
            // Support comma-separated IDs
            const ids = queryVal.split(',').map(id => id.trim()).filter(id => id);

            if (ids.length > 0) {
                const placeholders = ids.map(() => '?').join(',');
                const queryParams = [...ids, ...ids]; // For both ID and Register Number check if needed, or just ID if we strict.
                // Assuming we pass IDs from frontend. But search supports Reg No. check both.
                // Actually frontend sends ID now. Let's stick to ID or RegNo for flexibility.
                // But `IN` clause with OR is tricky.
                // Let's assume frontend sends IDs.

                const students = await new Promise((resolve, reject) => {
                    db.all(`SELECT full_name as name, email FROM students WHERE status = 'Active' AND id IN (${placeholders})`, ids, (err, rows) => err ? reject(err) : resolve(rows));
                });
                recipients = [...recipients, ...students];
            }
        }

        // Handle Overdue Students (Students with overdue books)
        if (recipient_group === 'Overdue') {
            const overdueStudents = await new Promise((resolve, reject) => {
                db.all(`
                    SELECT DISTINCT s.full_name as name, s.email 
                    FROM students s
                    INNER JOIN circulation c ON s.id = c.student_id
                    WHERE s.status = 'Active' AND date(c.due_date) < date('now')
                `, [], (err, rows) => err ? reject(err) : resolve(rows || []));
            });
            recipients = [...recipients, ...overdueStudents];
        }

        // Handle Issued Students (Students with currently issued books)
        if (recipient_group === 'Issued') {
            const issuedStudents = await new Promise((resolve, reject) => {
                db.all(`
                    SELECT DISTINCT s.full_name as name, s.email 
                    FROM students s
                    INNER JOIN circulation c ON s.id = c.student_id
                    WHERE s.status = 'Active'
                `, [], (err, rows) => err ? reject(err) : resolve(rows || []));
            });
            recipients = [...recipients, ...issuedStudents];
        }

        // Send Emails (Async - don't wait for all)
        let sentCount = 0;
        recipients.forEach(u => {
            if (u.email) {
                emailService.sendBroadcast(u, subject, message);
                sentCount++;
            }
        });

        // Generate Readable Target Display
        let recipientDisplay = recipient_group;
        if (recipient_group.startsWith('Student:')) {
            const names = recipients.map(r => r.name).filter(n => n).join(', ');
            recipientDisplay = names.length > 50 ? names.substring(0, 50) + '...' : names;
        } else if (recipient_group.startsWith('Dept:')) {
            // For departments, we might want to query the name or just format it nicely
            // Ideally we'd query the Dept Name, but for now let's just make it look better
            recipientDisplay = `Department (${recipient_group.split(':')[1]})`;
        } else if (recipient_group === 'Overdue') {
            recipientDisplay = 'Students with Overdue Books';
        } else if (recipient_group === 'Issued') {
            recipientDisplay = 'Students with Issued Books';
        }

        // Log Audit
        auditService.log(req.user, 'BROADCAST', 'Communication', `Sent broadcast '${subject}' to ${recipientDisplay} (${sentCount} recipients)`, { subject, message, recipient_group, recipient_display: recipientDisplay, sent_count: sentCount });

        socketService.emit('broadcast_update', {});
        res.json({ message: `Broadcast initiated to ${sentCount} recipients` });

    } catch (err) {
        console.error("Broadcast Error:", err);
        const errorMsg = err.message || (typeof err === 'string' ? err : JSON.stringify(err));
        res.status(500).json({ error: errorMsg || "Unknown Server Error" });
    }
};

// GET /api/admins/broadcast/history
exports.getBroadcastHistory = (req, res) => {
    const { order = 'desc' } = req.query;
    const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Add time to date format string in SQL or handle in JS. 
    // Just sort by timestamp here.
    const query = `SELECT * FROM audit_logs WHERE action_type = 'BROADCAST' ORDER BY timestamp ${sortOrder} LIMIT 50`;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Transform for frontend
        const history = rows.map(row => {
            let meta = {};
            try {
                meta = JSON.parse(row.metadata || '{}');
            } catch (e) { }

            // Safe Date Parsing for SQLite (YYYY-MM-DD HH:MM:SS)
            // Safe Date Parsing for SQLite (YYYY-MM-DD HH:MM:SS) -> DD/MM/YYYY
            let dateStr = row.timestamp;
            try {
                // If it's already a string like "YYYY-MM-DD HH:MM:SS"
                let parts = [];
                if (dateStr && dateStr.includes(' ')) {
                    const ymd = dateStr.split(' ')[0]; // YYYY-MM-DD
                    parts = ymd.split('-');
                } else {
                    // Start from ISO (Use IST Offset Helper to ensure correct day)
                    const iso = getISTISOWithOffset(new Date(row.timestamp)).split('T')[0];
                    parts = iso.split('-');
                }

                if (parts.length === 3) {
                    // Try to extract time from original timestamp string
                    let timeStr = '';
                    if (row.timestamp.includes(' ')) {
                        const timePart = row.timestamp.split(' ')[1];
                        if (timePart) timeStr = ' ' + timePart.substring(0, 5); // HH:MM
                    } else if (row.timestamp.includes('T')) {
                        const timePart = row.timestamp.split('T')[1];
                        if (timePart) timeStr = ' ' + timePart.substring(0, 5);
                    }

                    dateStr = `${parts[2]}/${parts[1]}/${parts[0]}${timeStr}`; // DD/MM/YYYY HH:MM
                }
            } catch (e) {
                dateStr = row.timestamp; // Fallback
            }

            let targetDisplay = meta.recipient_display || meta.recipient_group || 'Recipients';

            // Fallback for legacy logs (try to extract from description)
            if (targetDisplay === 'Recipients' || targetDisplay.startsWith('Student:') || targetDisplay.startsWith('Dept:')) {
                const match = row.description.match(/to (.+?) \(\d/);
                if (match && match[1]) {
                    targetDisplay = match[1];
                    // Clean up raw IDs if still present
                    if (targetDisplay.startsWith('Student:')) targetDisplay = 'Specific Students';
                }
            }

            return {
                id: row.id,
                date: dateStr,
                timestamp: row.timestamp,
                subject: meta.subject || 'Broadcast Message',
                target: targetDisplay,
                status: 'sent',
                description: row.description,
                message: meta.message || null
            };
        });

        res.json(history);
    });
};
