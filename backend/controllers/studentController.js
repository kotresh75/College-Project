const db = require('../db');
const { v4: uuidv4 } = require('uuid'); // Added for UUID generation
const socketService = require('../services/socketService'); // Socket

// GET /api/students
exports.getStudents = (req, res) => {
    const { page = 1, limit = 50, search = '', department = '', semester = '', sortBy = 'name', order = 'asc' } = req.query;
    const offset = (page - 1) * limit;

    // 1. Build Base Query Parts
    const baseFrom = `FROM students s LEFT JOIN departments d ON s.dept_id = d.id`;
    let whereClause = `WHERE (s.status != 'Deleted')`;
    let params = [];

    // 2. Add Filters
    if (search) {
        whereClause += " AND (s.full_name LIKE ? OR s.register_number LIKE ?)";
        params.push(`%${search}%`, `%${search}%`);
    }
    if (department) {
        whereClause += " AND d.name = ?";
        params.push(department);
    }
    if (semester) {
        whereClause += " AND s.semester = ?";
        params.push(semester);
    }

    // 3. Sort Logic
    const sortMap = {
        'name': 's.full_name',
        'register_no': 's.register_number',
        'department': 'd.name',
        'semester': 's.semester'
    };
    const sortCol = sortMap[sortBy] || 's.full_name';
    const sortOrder = (order && order.toLowerCase() === 'desc') ? 'DESC' : 'ASC';

    // 4. Construct Final Queries
    const query = `
        SELECT s.*, d.name as department_name 
        ${baseFrom} 
        ${whereClause} 
        ORDER BY ${sortCol} ${sortOrder} 
        LIMIT ? OFFSET ?
    `;

    const countQuery = `
        SELECT COUNT(*) as count 
        ${baseFrom} 
        ${whereClause}
    `;

    // 4. Execute Count Query First
    db.get(countQuery, params, (err, row) => {
        if (err) {
            console.error("Count Query Error:", err);
            return res.status(500).json({ error: err.message });
        }
        const total = row ? row.count : 0;

        // 5. Execute Data Query
        db.all(query, [...params, limit, offset], (err, rows) => {
            if (err) {
                console.error("Data Query Error:", err);
                return res.status(500).json({ error: err.message });
            }
            res.json({
                data: rows,
                pagination: {
                    total,
                    page: parseInt(page),
                    totalPages: Math.ceil(total / limit)
                }
            });
        });
    });
};

// GET /api/students/defaulters (For Promotion Check)
exports.getDefaulters = (req, res) => {
    // Find students with Unreturned Books or Unpaid Fines
    // Assumption: 'transactions' table tracks loans. 'fines' table tracks fines.
    const query = `
        SELECT s.id, s.full_name as name, s.register_number as register_no, d.name as department, 
               COUNT(DISTINCT t.id) as pending_books, 
               COUNT(DISTINCT f.id) as pending_fines
        FROM students s
        LEFT JOIN departments d ON s.dept_id = d.id
        LEFT JOIN circulation t ON s.id = t.student_id
        LEFT JOIN fines f ON s.id = f.student_id AND f.status = 'Unpaid'
        WHERE s.status = 'Active'
        GROUP BY s.id
        HAVING pending_books > 0 OR pending_fines > 0
    `;

    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

// POST /api/students (Create)
exports.createStudent = (req, res) => {
    let { name, father_name, register_no, department, semester, email, phone, address, dob } = req.body;
    if (!email) email = null; // Ensure empty string becomes null for UNIQUE constraint

    // Validate required fields (including DOB which is NOT NULL in DB)
    if (!name || !register_no || !department || !semester || !dob) {
        return res.status(400).json({ error: "Missing required fields (Name, RegNo, Dept, Sem, DOB)" });
    }

    // Auto-generate UUID for ID if not handled by DB (DB schema defines ID as TEXT PRIMARY KEY)
    const id = uuidv4();

    const query = `INSERT INTO students (id, full_name, father_name, register_number, dept_id, semester, email, phone, address, dob, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')`;
    db.run(query, [id, name, father_name, register_no, department, semester, email, phone, address, dob], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE')) return res.status(409).json({ error: "Register No or Email already exists" });
            return res.status(500).json({ error: err.message });
        }
        socketService.emit('student_update', { type: 'CREATE', id });
        res.json({ id: id, message: "Student created successfully" });
    });
};

// PUT /api/students/:id
exports.updateStudent = (req, res) => {
    const { name, father_name, register_no, department, semester, email, phone, address, status, dob } = req.body;
    const { id } = req.params;

    const query = `UPDATE students SET full_name=?, father_name=?, register_number=?, dept_id=?, semester=?, email=?, phone=?, address=?, status=?, dob=? WHERE id=?`;
    db.run(query, [name, father_name, register_no, department, semester, email, phone, address, status, dob, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        socketService.emit('student_update', { type: 'UPDATE', id });
        res.json({ message: "Student updated" });
    });
};

// DELETE /api/students/:id (Permanent Delete)
// DELETE /api/students/:id (Permanent Delete)
exports.deleteStudent = (req, res) => {
    const { id } = req.params;

    db.serialize(() => {
        // 1. Check Liabilities (Active Loans OR Unpaid Fines)
        db.get(`
            SELECT 
                (SELECT COUNT(*) FROM circulation WHERE student_id = ?) as loans,
                (SELECT COUNT(*) FROM fines WHERE student_id = ? AND is_paid = 0) as unpaid_fines
        `, [id, id], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });

            if (row.loans > 0) {
                return res.status(400).json({ error: `Cannot delete: Student has ${row.loans} active book loans.` });
            }
            if (row.unpaid_fines > 0) {
                return res.status(400).json({ error: `Cannot delete: Student has ${row.unpaid_fines} unpaid fines.` });
            }

            // 2. Disconnect History (Anonymize)
            // Break link to transaction_logs (Nullify ID, Suffix Name)
            db.run("UPDATE transaction_logs SET student_id = NULL, student_name = student_name || ' (Deleted)' WHERE student_id = ?", [id]);

            // Break link to Paid Fines (Nullify ID, Suffix Name) - Unpaid already checked above
            db.run("UPDATE fines SET student_id = NULL, student_name = student_name || ' (Deleted)' WHERE student_id = ?", [id]);

            // 3. Permanent Delete
            db.run("DELETE FROM students WHERE id=?", [id], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                if (this.changes === 0) return res.status(404).json({ error: "Student not found" });
                socketService.emit('student_update', { type: 'DELETE', id });
                res.json({ message: "Student permanently deleted and history anonymized." });
            });
        });
    });
};

// POST /api/students/bulk-delete
exports.bulkDelete = (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "Invalid IDs" });

    const placeholders = ids.map(() => '?').join(',');

    db.serialize(() => {
        // 1. Check Liabilities for ALL students (Active Loans OR Unpaid Fines)
        const placeholders = ids.map(() => '?').join(',');

        // Check for Active Loans
        db.all(`SELECT student_id, COUNT(*) as count FROM circulation WHERE student_id IN (${placeholders}) GROUP BY student_id`, ids, (err, activeLoans) => {
            if (err) return res.status(500).json({ error: err.message });

            if (activeLoans.length > 0) {
                return res.status(400).json({ error: `Cannot delete: ${activeLoans.length} students have active loans.` });
            }

            // Check for Unpaid Fines
            db.all(`SELECT student_id, COUNT(*) as count FROM fines WHERE student_id IN (${placeholders}) AND is_paid = 0 GROUP BY student_id`, ids, (err, unpaidFines) => {
                if (err) return res.status(500).json({ error: err.message });

                if (unpaidFines.length > 0) {
                    return res.status(400).json({ error: `Cannot delete: ${unpaidFines.length} students have unpaid fines.` });
                }

                // 2. Disconnect History (Anonymize)
                // Transaction Logs
                db.run(`UPDATE transaction_logs SET student_id = NULL, student_name = student_name || ' (Deleted)' WHERE student_id IN (${placeholders})`, ids);

                // Paid Fines (Unpaid are blocked)
                db.run(`UPDATE fines SET student_id = NULL, student_name = student_name || ' (Deleted)' WHERE student_id IN (${placeholders})`, ids);

                // 3. Permanent Delete
                db.run(`DELETE FROM students WHERE id IN (${placeholders})`, ids, function (err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ message: `${this.changes} students permanently deleted and history anonymized.` });
                });
            });
        });
    });
};

// POST /api/students/bulk-update
exports.bulkUpdate = (req, res) => {
    const { ids, updates } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "Invalid IDs" });
    if (!updates || Object.keys(updates).length === 0) return res.status(400).json({ error: "No updates provided" });

    const placeholders = ids.map(() => '?').join(',');
    const fields = [];
    const values = [];

    // Allow updating semester and status
    if (updates.semester) {
        fields.push("semester = ?");
        values.push(updates.semester);
    }
    if (updates.status) {
        fields.push("status = ?");
        values.push(updates.status);
    }

    if (fields.length === 0) return res.status(400).json({ error: "Invalid update fields" });

    const query = `UPDATE students SET ${fields.join(', ')} WHERE id IN (${placeholders})`;

    db.run(query, [...values, ...ids], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: `${this.changes} students updated` });
    });
};


// POST /api/students/bulk-promote
exports.bulkPromote = (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: "Invalid IDs" });

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        const placeholders = ids.map(() => '?').join(',');

        // 1. Graduate Sem 6 -> Alumni
        db.run(`UPDATE students SET semester='Alumni', status='Graduated' WHERE semester='6' AND id IN (${placeholders})`, ids, (err) => {
            if (err) { db.run("ROLLBACK"); return res.status(500).json({ error: err.message }); }

            // 2. Promote Sem 1-5 -> +1
            db.run(`UPDATE students SET semester = CAST(semester AS INTEGER) + 1 WHERE semester IN ('1','2','3','4','5') AND id IN (${placeholders})`, ids, (err) => {
                if (err) { db.run("ROLLBACK"); return res.status(500).json({ error: err.message }); }

                db.run("COMMIT");
                res.json({ message: "Selected students promoted" });
            });
        });
    });
};

// POST /api/students/bulk-demote
exports.bulkDemote = (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: "Invalid IDs" });

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        const placeholders = ids.map(() => '?').join(',');

        // 1. Demote Sem 2-6 -> -1
        db.run(`UPDATE students SET semester = CAST(semester AS INTEGER) - 1 WHERE semester IN ('2','3','4','5','6') AND id IN (${placeholders})`, ids, (err) => {
            if (err) { db.run("ROLLBACK"); return res.status(500).json({ error: err.message }); }

            // 2. Un-Graduate Alumni -> Sem 6
            db.run(`UPDATE students SET semester='6', status='Active' WHERE semester='Alumni' AND id IN (${placeholders})`, ids, (err) => {
                if (err) { db.run("ROLLBACK"); return res.status(500).json({ error: err.message }); }

                db.run("COMMIT");
                res.json({ message: "Selected students demoted" });
            });
        });
    });
};

// POST /api/students/export
exports.exportStudents = (req, res) => {
    const { scope, format, filters, ids } = req.body;

    let query = `
        SELECT s.full_name, s.father_name, s.register_number, s.profile_image, d.name as department, s.semester, s.status, s.email, s.phone, s.dob, s.address
        FROM students s
        LEFT JOIN departments d ON s.dept_id = d.id
        WHERE s.status != 'Deleted'
    `;
    let params = [];

    if (scope === 'selected' && ids && ids.length > 0) {
        const ph = ids.map(() => '?').join(',');
        query += ` AND s.id IN (${ph})`;
        params = ids;
    } else if (scope === 'filtered') {
        if (filters.search) {
            query += " AND (s.full_name LIKE ? OR s.register_number LIKE ?)";
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }
        if (filters.department) {
            query += " AND d.name = ?";
            params.push(filters.department);
        }
        if (filters.semester) {
            query += " AND s.semester = ?";
            params.push(filters.semester);
        }
    }

    query += " ORDER BY s.register_number ASC";

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        if (format === 'csv') {
            // Manual CSV Generation
            const headers = ['Name', 'Father Name', 'Register No', 'Department', 'Semester', 'Status', 'Email', 'Phone', 'DOB', 'Address'];
            const csvRows = rows.map(r => [
                `"${r.full_name}"`,
                `"${r.father_name || ''}"`,
                `"${r.register_number}"`,
                `"${r.department || ''}"`,
                `"${r.semester}"`,
                `"${r.status}"`,
                `"${r.email}"`,
                `"${r.phone}"`,
                `"${r.dob}"`,
                `"${r.address ? r.address.replace(/"/g, '""') : ''}"` // Escape quotes
            ].join(','));

            const csvString = [headers.join(','), ...csvRows].join('\n');

            res.header('Content-Type', 'text/csv');
            res.attachment('students_export.csv');
            res.send(csvString);
        } else {
            // For PDF, we just send JSON, frontend will handle "Print View"
            res.json(rows);
        }
    });
};

// POST /api/students/promote (Global Promotion)
// POST /api/students/promotion-scan
exports.scanForPromotion = (req, res) => {
    // 1. Get total active students (eligible for promotion consideration)
    // 2. Get students with liabilities (defaulters)
    // 3. Return summary

    const queryDefaulters = `
        SELECT s.id, s.full_name, s.register_number, s.semester, d.name as department,
               COUNT(DISTINCT t.id) as pending_books, 
               COUNT(DISTINCT f.id) as pending_fines
        FROM students s
        LEFT JOIN departments d ON s.dept_id = d.id
        LEFT JOIN circulation t ON s.id = t.student_id
        LEFT JOIN fines f ON s.id = f.student_id AND f.status = 'Unpaid'
        WHERE s.status = 'Active'
        GROUP BY s.id
        HAVING pending_books > 0 OR pending_fines > 0
    `;

    const queryTotal = `SELECT COUNT(*) as count FROM students WHERE status = 'Active'`;

    db.get(queryTotal, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        const totalActive = row ? row.count : 0;

        db.all(queryDefaulters, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });

            res.json({
                total_active: totalActive,
                eligible_count: totalActive - rows.length,
                defaulter_count: rows.length,
                liabilities: rows // List of defaulters
            });
        });
    });
};

// POST /api/students/promote (Global Promotion with Exclusions)
exports.promoteStudents = (req, res) => {
    const { exclude_ids } = req.body; // Array of IDs to skip
    const exclusions = (exclude_ids && Array.isArray(exclude_ids)) ? exclude_ids : [];

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        // Helper to build NOT IN clause
        const notInClause = exclusions.length > 0
            ? `AND id NOT IN (${exclusions.map(() => '?').join(',')})`
            : '';

        // Step 1: Graduate Final Years (Sem 6) -> Alumni
        // Use exclusions array for params
        const q1 = `UPDATE students SET status = 'Graduated', semester = 'Alumni' WHERE semester = '6' AND status = 'Active' ${notInClause}`;

        db.run(q1, exclusions, function (err) {
            if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: "Failed to graduate final year students: " + err.message });
            }

            // Step 2: Promote others (Sem 1-5 -> +1)
            // Reuse exclusions array for params
            const q2 = `UPDATE students SET semester = CAST(semester AS INTEGER) + 1 WHERE semester IN ('1','2','3','4','5') AND status = 'Active' ${notInClause}`;

            db.run(q2, exclusions, function (err) {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: "Failed to promote intermediate students: " + err.message });
                }

                db.run("COMMIT");
                res.json({ message: "Promotion workflow completed successfully.", promoted_count: this.changes });
            });
        });
    });
};


// POST /api/students/bulk-import
exports.bulkImport = (req, res) => {
    const students = req.body; // Array of { name, register_no, department, semester, email, phone, dob, address }
    if (!Array.isArray(students) || students.length === 0) {
        return res.status(400).json({ error: "Invalid data" });
    }

    let success = 0;
    let failed = 0;

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        const stmt = db.prepare(`INSERT OR IGNORE INTO students (id, full_name, father_name, register_number, dept_id, semester, email, phone, address, dob, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')`);

        students.forEach(s => {
            const id = uuidv4();
            // Ensure DOB is present, else skip or default? 
            // If missing DOB, it will fail NOT NULL constraint (failed++).
            stmt.run([id, s.name, s.father_name, s.register_no, s.department, s.semester || '1', s.email, s.phone, s.address, s.dob], function (err) {
                if (err) {
                    console.error("Import Error:", err.message);
                    failed++;
                }
                else if (this.changes > 0) success++;
                else failed++; // duplicate ignored
            });
        });

        stmt.finalize();
        db.run("COMMIT", () => {
            res.json({ message: "Bulk import complete", success, failed });
        });
    });
};
// POST /api/students/photo/upload
exports.uploadPhoto = (req, res) => {
    const { register_no, image_data } = req.body;

    if (!register_no || !image_data) {
        return res.status(400).json({ error: "Missing Register No or Image Data" });
    }

    const query = `UPDATE students SET profile_image = ? WHERE register_number = ?`;

    db.run(query, [image_data, register_no], function (err) {
        if (err) {
            console.error("Photo Upload Error:", err);
            return res.status(500).json({ error: "Database error" });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: "Student not found" });
        }

        socketService.emit('student_update', { type: 'UPDATE', register_no });
        res.json({ message: "Photo updated successfully" });
    });
};

// POST /api/students/photo/bulk-delete
exports.bulkDeletePhotos = (req, res) => {
    const query = `UPDATE students SET profile_image = NULL`;

    db.run(query, function (err) {
        if (err) {
            console.error("Bulk Photo Delete Error:", err);
            return res.status(500).json({ error: "Database error" });
        }

        socketService.emit('student_update', { type: 'BULK_UPDATE' });
        res.json({ message: `Successfully deleted profile images for ${this.changes} students.` });
    });
};
// GET /api/students/photo/stats
exports.getPhotoStats = (req, res) => {
    const query = `SELECT COUNT(*) as count FROM students WHERE profile_image IS NOT NULL AND profile_image != ''`;
    db.get(query, (err, row) => {
        if (err) {
            console.error("Photo Stats Error:", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json({ count: row.count || 0 });
    });
};

// GET /api/students/id-cards — Bulk fetch for ID card PDF generation
exports.getStudentsForIdCards = (req, res) => {
    const { department, semester } = req.query;

    let query = `
        SELECT s.id, s.full_name, s.father_name, s.register_number, s.phone,
               s.semester, s.dept_id, s.profile_image,
               d.name as department_name, d.code as department_code
        FROM students s
        LEFT JOIN departments d ON s.dept_id = d.id
        WHERE s.status = 'Active'
    `;
    let params = [];

    if (department) {
        query += " AND d.name = ?";
        params.push(department);
    }
    if (semester) {
        query += " AND s.semester = ?";
        params.push(semester);
    }

    query += " ORDER BY s.register_number ASC";

    // First get count
    const countQuery = `
        SELECT COUNT(*) as count
        FROM students s
        LEFT JOIN departments d ON s.dept_id = d.id
        WHERE s.status = 'Active'
        ${department ? " AND d.name = ?" : ""}
        ${semester ? " AND s.semester = ?" : ""}
    `;

    db.get(countQuery, params, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        const total = row ? row.count : 0;

        db.all(query, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ data: rows, total });
        });
    });
};
