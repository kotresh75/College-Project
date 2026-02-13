const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const emailService = require('../services/emailService');
const { getISTDate, getSQLiteISTTimestamp, getISTISOWithOffset } = require('../utils/dateUtils');
const auditService = require('../services/auditService');
const socketService = require('../services/socketService'); // Socket

// --- Helper: Get Settings ---
const getSetting = (key, defaultVal) => {
    return new Promise((resolve) => {
        db.get("SELECT value FROM system_settings WHERE key = ?", [key], (err, row) => {
            if (err || !row) return resolve(defaultVal);
            try {
                // Try parsing if it looks like an object/array, otherwise return raw
                if (row.value.startsWith('{') || row.value.startsWith('[')) {
                    resolve(JSON.parse(row.value));
                } else {
                    resolve(row.value);
                }
            } catch (e) {
                resolve(row.value || defaultVal);
            }
        });
    });
};



// GET /api/circulation/validate-borrower/:identifier
// Identifier can be Register Number or Student ID
exports.validateBorrower = async (req, res) => {
    const { identifier } = req.params;

    try {
        // 1. Fetch Student
        const student = await new Promise((resolve, reject) => {
            db.get(
                `SELECT s.*, d.name as department_name, d.code as department_code 
                 FROM students s 
                 LEFT JOIN departments d ON s.dept_id = d.id 
                 WHERE s.register_number = ? OR s.id = ?`,
                [identifier, identifier],
                (err, row) => err ? reject(err) : resolve(row)
            );
        });

        if (!student) return res.status(404).json({ error: "Student not found" });
        if (student.status !== 'Active') return res.status(400).json({ error: `Student is ${student.status}` });

        // 2. Fetch Policies
        const policyBorrowing = await getSetting('policy_borrowing', {});
        const studentPolicy = policyBorrowing['student'] || {};
        const maxLoans = parseInt(studentPolicy.maxBooks) || 5;
        // Correctly read blockFineThreshold from student profile
        const fineLimit = parseFloat(studentPolicy.blockFineThreshold) || 500;

        // 3. Check Unpaid Fines (Existing)
        const unpaidFines = await new Promise((resolve) => {
            db.get(
                `SELECT SUM(amount) as total FROM fines WHERE student_id = ? AND status = 'Unpaid'`,
                [student.id],
                (err, row) => resolve(row ? row.total || 0 : 0)
            );
        });


        // 4. Calculate Estimated Fines on Active Overdue Loans
        // Fetch all active loans to check due dates
        const activeLoansData = await new Promise((resolve, reject) => {
            db.all(`SELECT due_date FROM circulation WHERE student_id = ?`, [student.id], (err, rows) => err ? reject(err) : resolve(rows || []));
        });

        const activeLoansCount = activeLoansData.length;

        // Fetch Financial Policy for Rate
        const policyFinancial = await getSetting('policy_financial', {});
        const dailyFineRate = parseFloat(policyFinancial.dailyFineRate) || 1.00;

        let estimatedOverdueFines = 0;
        const now = getISTDate();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const nowDateStr = now.toISOString().split('T')[0]; // IST date as YYYY-MM-DD

        activeLoansData.forEach(loan => {
            const dueDateParsed = new Date(loan.due_date);
            // Convert real-UTC dueDate to fake-IST to extract IST date string
            const dueDateIST = new Date(dueDateParsed.getTime() + istOffset);
            const dueDateStr = dueDateIST.toISOString().split('T')[0];
            if (nowDateStr > dueDateStr) {
                const diffDays = Math.ceil((new Date(nowDateStr) - new Date(dueDateStr)) / (1000 * 60 * 60 * 24));
                // Grace Period Removed: Fine applies to all overdue days immediately
                estimatedOverdueFines += (diffDays * dailyFineRate);
            }
        });

        const totalLiability = unpaidFines + estimatedOverdueFines;

        const alerts = [];
        let valid = true;

        if (totalLiability > fineLimit) {
            valid = false;
            alerts.push(`Blocked: Total Liability ₹${totalLiability} (Fines: ₹${unpaidFines} + Overdue: ₹${estimatedOverdueFines}) exceeds limit (₹${fineLimit})`);
        }
        if (activeLoansCount >= maxLoans) {
            valid = false;
            alerts.push(`Max Borrow Limit Reached (${activeLoansCount}/${maxLoans})`);
        }

        res.json({
            valid,
            student,
            stats: {
                active_loans: activeLoansCount,
                unpaid_fines: unpaidFines,
                estimated_overdue_fines: estimatedOverdueFines,
                total_liability: totalLiability
            },
            alerts
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/circulation/issue
// Body: { student_id, copy_accession_numbers: [] }
exports.issueBook = async (req, res) => {
    const { student_id, copy_accession_numbers } = req.body;
    const staffId = req.user ? req.user.id : 'SYSTEM';
    const staffRole = req.user ? req.user.role : 'Staff';

    if (!student_id || !copy_accession_numbers || copy_accession_numbers.length === 0) {
        return res.status(400).json({ error: "Invalid Request" });
    }

    try {
        // Fetch Policy
        const policyBorrowing = await getSetting('policy_borrowing', {});
        const studentPolicy = policyBorrowing['student'] || {};
        const maxLoans = parseInt(studentPolicy.maxBooks) || 5;
        const loanDays = parseInt(studentPolicy.loanDays) || 15;

        // Verify Max Loans again (Concurrency check)
        const activeLoans = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as count FROM circulation WHERE student_id = ?`, [student_id], (err, row) => err ? reject(err) : resolve(row ? row.count : 0));
        });

        if (activeLoans + copy_accession_numbers.length > maxLoans) {
            return res.status(400).json({ error: `Cannot issue. Limit exceeded (${activeLoans}/${maxLoans}).` });
        }

        // Fetch Student Details ONCE (Name, RegNo, Dept, Email)
        const studentDetails = await new Promise((resolve) => {
            db.get(`SELECT s.full_name, s.register_number, s.dept_id, s.email, d.name as department_name 
                    FROM students s 
                    LEFT JOIN departments d ON s.dept_id = d.id 
                    WHERE s.id = ?`, [student_id], (err, row) => resolve(row));
        });

        if (!studentDetails) return res.status(404).json({ error: "Student not found" });

        // Fix for FK Constraint: 'circulation' and 'transaction_logs' reference 'staff(id)'
        // Since FK constraint is removed, we can use any actor ID (Admin or Staff)
        const dbStaffId = req.user ? req.user.id : 'SYSTEM';
        const auditActorId = req.user ? req.user.id : 'SYSTEM';

        const results = [];
        const sessionTxnId = `TXN-${Date.now()}`;

        for (const accNum of copy_accession_numbers) {
            // Find Copy
            const copy = await new Promise((resolve) => {
                db.get(`
                    SELECT c.id, c.status, b.title, b.isbn, b.author, b.publisher 
                    FROM book_copies c 
                    JOIN books b ON c.book_isbn = b.isbn 
                    WHERE c.accession_number = ?`,
                    [accNum], (err, row) => resolve(row));
            });

            if (!copy) {
                results.push({ accession: accNum, status: 'Failed', reason: 'Copy not found' });
                continue;
            }
            if (copy.status !== 'Available') {
                results.push({ accession: accNum, status: 'Failed', reason: `Copy is ${copy.status}` });
                continue;
            }

            // Calculate Due Date (Dynamic)
            const issueDate = getISTDate();
            const dueDate = getISTDate();
            dueDate.setUTCDate(issueDate.getUTCDate() + loanDays);
            dueDate.setUTCHours(23, 59, 59, 999); // End of day

            const txnId = uuidv4();

            // 1. Insert into Active Circulation (STATE)
            await new Promise((resolve, reject) => {
                db.run(`INSERT INTO circulation (id, session_txn_id, student_id, copy_id, issued_by, issue_date, due_date) 
                        VALUES (?, ?, ?, ?, ?, datetime('now', '+05:30'), ?)`,
                    [txnId, sessionTxnId, student_id, copy.id, dbStaffId, getISTISOWithOffset(dueDate)],
                    (err) => err ? reject(err) : resolve()
                );
            });

            // 2. Insert into Transaction Logs (HISTORY) - Action: ISSUE
            const istDate = getISTDate();
            const dateStr = istDate.toISOString().split('T')[0]; // YYYY-MM-DD
            const timeStr = istDate.toTimeString().split(' ')[0]; // HH:MM:SS

            await new Promise((resolve, reject) => {
                db.run(`INSERT INTO transaction_logs (id, session_txn_id, action_type, student_id, student_name, student_reg_no, student_dept, copy_id, book_title, book_isbn, performed_by, details, timestamp) 
                         VALUES (?, ?, 'ISSUE', ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+05:30'))`,
                    [uuidv4(), sessionTxnId, student_id, studentDetails.full_name, studentDetails.register_number, studentDetails.department_name, copy.id, copy.title, copy.isbn || 'N/A', dbStaffId, JSON.stringify({
                        due_date: getISTISOWithOffset(dueDate),
                        loan_days: loanDays,
                        accession: accNum,
                        author: copy.author,
                        publisher: copy.publisher,
                        action_date: dateStr,
                        action_time: timeStr
                    })],
                    (err) => err ? reject(err) : resolve()
                );
            });

            // 3. Update Copy Status
            await new Promise((resolve) => {
                db.run(`UPDATE book_copies SET status = 'Issued', updated_at = datetime('now', '+05:30') WHERE id = ?`, [copy.id], () => resolve());
            });

            results.push({ accession: accNum, status: 'Success', title: copy.title, due_date: dueDate });
        }

        const auditUser = req.user ? { id: req.user.id, role: req.user.role } : 'SYSTEM';
        const successCount = results.filter(r => r.status === 'Success').length;
        auditService.log(auditUser, 'ISSUE', 'Circulation', `Issued ${successCount} books to ${studentDetails.full_name} (${studentDetails.register_number})`, { session_id: sessionTxnId });

        // Send Email Receipt
        if (studentDetails.email) {
            results.forEach(r => {
                if (r.status === 'Success') {
                    emailService.sendTransactionReceipt('ISSUE', { full_name: studentDetails.full_name, email: studentDetails.email }, {
                        title: r.title,
                        accession: r.accession,
                        due_date: r.due_date
                    });
                }
            });
        }

        // Socket Emit
        socketService.emit('circulation_update', { type: 'ISSUE', student_id, txn_id: sessionTxnId });
        socketService.emit('book_update', { type: 'STATUS_CHANGE' });

        res.json({ session_txn_id: sessionTxnId, results });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/circulation/loans/:studentId
exports.getStudentActiveLoans = (req, res) => {
    const { studentId } = req.params;

    // Reads from 'circulation' table
    // Added renewal_count subquery to support frontend UI
    const query = `
        SELECT c.id as transaction_id, c.issue_date, c.due_date, 
               bc.accession_number, b.title, b.author, b.isbn as book_isbn, b.cover_image,
               (julianday(datetime('now', '+05:30')) - julianday(c.due_date)) as overdue_days,
               (SELECT COUNT(*) FROM transaction_logs 
                WHERE student_id = c.student_id AND copy_id = c.copy_id 
                AND action_type = 'RENEW' AND timestamp > c.issue_date) as renewal_count
        FROM circulation c
        JOIN book_copies bc ON c.copy_id = bc.id
        JOIN books b ON bc.book_isbn = b.isbn
        WHERE c.student_id = ?
    `;

    db.all(query, [studentId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

// POST /api/circulation/return
// Body: { transaction_id, condition, remarks }
// Note: transaction_id here acts as the 'loan id' from circulation table
exports.returnBook = async (req, res) => {
    const { transaction_id, condition, remarks } = req.body;
    // Fix for FK Constraint: 'transaction_logs' and 'fines' reference 'staff(id)'
    // Since FK constraint is removed, we can use any actor ID (Admin or Staff)
    const dbStaffId = req.user ? req.user.id : 'SYSTEM';
    const auditActorId = req.user ? req.user.id : 'SYSTEM';
    const staffRole = req.user ? req.user.role : 'Staff';

    // condition: 'Good', 'Damaged', 'Lost'

    try {
        // 1. Fetch Active Loan
        // 1. Fetch Active Loan (with Title)
        const loan = await new Promise((resolve, reject) => {
            db.get(`
                SELECT c.*, b.title, b.isbn as book_isbn, bc.accession_number
                FROM circulation c 
                JOIN book_copies bc ON c.copy_id = bc.id 
                JOIN books b ON bc.book_isbn = b.isbn 
                WHERE c.id = ?`,
                [transaction_id], (err, row) => err ? reject(err) : resolve(row));
        });

        if (!loan) return res.status(400).json({ error: "Invalid loan ID or Book already returned" });

        // Calculate Fines (normalize both dates to IST date-only for accurate comparison)
        const now = getISTDate();
        const dueDateParsed = new Date(loan.due_date); // stored ISO string with +05:30
        const istOffset = 5.5 * 60 * 60 * 1000;
        // Convert real-UTC dueDate to fake-IST to extract IST date string
        const dueDateIST = new Date(dueDateParsed.getTime() + istOffset);
        const nowDateStr = now.toISOString().split('T')[0]; // IST date as YYYY-MM-DD
        const dueDateStr = dueDateIST.toISOString().split('T')[0];
        const isOverdue = nowDateStr > dueDateStr;
        // Calculate days using date-only strings (avoids hour-level timezone issues)
        const diffDays = isOverdue
            ? Math.ceil((new Date(nowDateStr) - new Date(dueDateStr)) / (1000 * 60 * 60 * 24))
            : 0;

        // Fetch Policies for Fine Calculation
        const [policyBorrowing, policyFinancial] = await Promise.all([
            getSetting('policy_borrowing', {}),
            getSetting('policy_financial', {})
        ]);
        const studentPolicy = policyBorrowing['student'] || {};
        const gracePeriod = parseInt(studentPolicy.gracePeriod) || 0;
        const dailyFineRate = parseFloat(policyFinancial.dailyFineRate) || 1.00;
        const maxFineCap = parseFloat(policyFinancial.maxFinePerStudent) || 1000.00;

        // Fetch Existing Unpaid Fines for Cap Check
        const existingFines = await new Promise((resolve) => {
            db.get(`SELECT SUM(amount) as total FROM fines WHERE student_id = ? AND is_paid = 0`, [loan.student_id], (err, row) => resolve(row ? row.total || 0 : 0));
        });

        let fineAmount = 0;
        let fineRemark = '';

        if (isOverdue) {
            // Fines apply immediately (Grace Period removed as per request)
            const effectiveOverdueDays = diffDays;
            fineAmount += (effectiveOverdueDays * dailyFineRate);
            fineRemark += `Overdue by ${effectiveOverdueDays} days (Rate: ₹${dailyFineRate}/day). `;
        }

        // Handle Condition & Custom Fine
        let copyStatus = 'Available';
        // Allow custom fine override if provided (User requested editable fines)
        const customFineAmount = (req.body.custom_fine_amount !== undefined && req.body.custom_fine_amount !== null)
            ? parseFloat(req.body.custom_fine_amount)
            : null;

        const damagedFine = (customFineAmount !== null && condition === 'Damaged') ? customFineAmount : (parseInt(policyFinancial.damagedFineAmount) || 100);
        const lostFine = (customFineAmount !== null && condition === 'Lost') ? customFineAmount : (parseInt(policyFinancial.lostFineAmount) || 500);

        if (condition === 'Damaged') {
            copyStatus = 'Maintenance';
            fineAmount += damagedFine;
            fineRemark += `Book Damaged (Fine: ₹${damagedFine}). `;
        } else if (condition === 'Lost') {
            copyStatus = 'Lost';
            fineAmount += lostFine;
            fineRemark += `Book Lost (Fine: ₹${lostFine}). `;
        }



        // 2. Insert into Transaction Logs (HISTORY) - Action: RETURN
        // Use loan details (fetched with title above) and re-fetch student details for latest snapshot
        const studentDetails = await new Promise((resolve) => {
            db.get("SELECT full_name, register_number, dept_id FROM students WHERE id = ?", [loan.student_id], (err, row) => resolve(row));
        });
        const deptName = await new Promise((resolve) => {
            if (!studentDetails || !studentDetails.dept_id) resolve('');
            else db.get("SELECT name FROM departments WHERE id = ?", [studentDetails.dept_id], (err, row) => resolve(row ? row.name : ''));
        });

        const logId = uuidv4();
        const istDateRet = getISTDate();
        const dateStrRet = istDateRet.toISOString().split('T')[0];
        const timeStrRet = istDateRet.toTimeString().split(' ')[0];

        await new Promise((resolve, reject) => {
            db.run(`INSERT INTO transaction_logs (id, session_txn_id, action_type, student_id, student_name, student_reg_no, student_dept, copy_id, book_title, book_isbn, performed_by, details, timestamp) 
                     VALUES (?, ?, 'RETURN', ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+05:30'))`,
                [logId, loan.session_txn_id, loan.student_id, studentDetails?.full_name, studentDetails?.register_number, deptName, loan.copy_id, loan.title, loan.book_isbn || 'N/A', dbStaffId, JSON.stringify({
                    condition,
                    remarks,
                    fine_amount: fineAmount,
                    return_date: getISTISOWithOffset(), // Defaults to now
                    replacement_given: req.body.replacement_given,
                    new_accession: req.body.new_accession_number,
                    accession: loan.accession_number,
                    author: loan.author,
                    publisher: loan.publisher,
                    action_date: dateStrRet,
                    action_time: timeStrRet,
                    due_date: loan.due_date,
                    issue_date: loan.issue_date,
                    last_renewed_date: loan.last_renewed_date || null
                })],
                (err) => err ? reject(err) : resolve()
            );
        });

        // 3. Remove from Active Circulation (STATE)
        await new Promise((resolve) => {
            db.run(`DELETE FROM circulation WHERE id = ?`, [transaction_id], () => resolve());
        });

        // 4. Update Copy Status & Handle Replacement
        await new Promise((resolve) => {
            db.run(`UPDATE book_copies SET status = ? WHERE id = ?`, [copyStatus, loan.copy_id], () => resolve());
        });

        // Handle Replacement Copy Logic
        if (condition === 'Lost' && req.body.replacement_given && req.body.new_accession_number) {
            const newAccession = req.body.new_accession_number;
            // Fetch book details from old copy to duplicate
            const oldCopy = await new Promise(r => db.get("SELECT book_isbn, book_id FROM book_copies WHERE id = ?", [loan.copy_id], (e, row) => r(row)));

            if (oldCopy) {
                await new Promise((resolve) => {
                    // Start transaction for safety? (Already implicit or separate statements)
                    // Insert new copy
                    const newCopyId = uuidv4();
                    db.run(`INSERT INTO book_copies (id, accession_number, book_isbn, book_id, status) VALUES (?, ?, ?, ?, 'Available')`,
                        [newCopyId, newAccession, oldCopy.book_isbn, oldCopy.book_id || null],
                        (err) => {
                            if (err) console.error("Failed to insert replacement copy:", err);
                            else console.log(`[Replacement] Added new copy ${newAccession} for lost book`);
                            resolve();
                        }
                    );
                });
            }
        }

        // 5. Create Fine if needed
        let fineId = null;
        if (fineAmount > 0) {
            fineId = uuidv4();
            const receiptNumber = `FINE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            await new Promise((resolve) => {
                db.run(`INSERT INTO fines (id, receipt_number, transaction_id, student_id, student_name, student_reg_no, amount, status, remark, collected_by) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, 'Unpaid', ?, ?)`,
                    [fineId, receiptNumber, logId, loan.student_id, studentDetails?.full_name, studentDetails?.register_number, fineAmount, fineRemark, dbStaffId],
                    (err) => {
                        if (err) console.error("Failed to insert fine:", err);
                        resolve();
                    }
                );
            });
        }

        const auditUser = req.user ? { id: req.user.id, role: req.user.role } : 'SYSTEM';
        auditService.log(auditUser, 'RETURN', 'Circulation', `Returned book '${loan.title}' from ${studentDetails.full_name} (${studentDetails.register_number}). Condition: ${condition}`, { fine_amount: fineAmount });

        // Send Email Receipt
        const studentQuery = "SELECT full_name as name, email FROM students WHERE id = ?";
        db.get(studentQuery, [loan.student_id], (err, student) => {
            if (student && student.email) {
                emailService.sendTransactionReceipt('RETURN', student, {
                    title: loan.title,
                    fine_amount: fineAmount
                });
            }
        });

        // Socket Emit
        socketService.emit('circulation_update', { type: 'RETURN', student_id: loan.student_id });
        socketService.emit('book_update', { type: 'STATUS_CHANGE' });

        res.json({ message: "Returned successfully", fine_generated: fineAmount > 0, fine_amount: fineAmount });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/circulation/renew
exports.renewBook = async (req, res) => {
    const { transaction_id, new_due_date } = req.body;
    // Fix for FK Constraint: 'transaction_logs' references 'staff(id)'
    const dbStaffId = req.user ? req.user.id : 'SYSTEM';
    const auditActorId = req.user ? req.user.id : 'SYSTEM';
    const staffRole = req.user ? req.user.role : 'Staff';

    try {
        // 1. Fetch Loan Details (with Title)
        const loan = await new Promise((resolve, reject) => {
            db.get(`
                SELECT c.*, b.title, b.isbn as book_isbn, bc.accession_number, b.author, b.publisher
                FROM circulation c 
                JOIN book_copies bc ON c.copy_id = bc.id 
                JOIN books b ON bc.book_isbn = b.isbn 
                WHERE c.id = ?`,
                [transaction_id], (err, row) => err ? reject(err) : resolve(row));
        });

        if (!loan) return res.status(400).json({ error: "Loan not found" });

        // 2. Fetch Policy
        const policyBorrowing = await getSetting('policy_borrowing', {});
        const studentPolicy = policyBorrowing['student'] || {}; // Assuming student for now

        // Correctly handle 0 as a valid value
        let maxRenewals = 1;
        if (studentPolicy.maxRenewals !== undefined && studentPolicy.maxRenewals !== null) {
            maxRenewals = parseInt(studentPolicy.maxRenewals);
        }

        // Check for specific renewal days setting, fallback to loanDays, enable fallback to default 15
        const renewalDays = parseInt(studentPolicy.renewalDays) || parseInt(studentPolicy.loanDays) || 15;

        console.log(`[Renew Debug] Loan ${transaction_id}. Policy Max: ${maxRenewals}, Renew Days: ${renewalDays}. Issue Date: ${loan.issue_date}`);

        // 3. Check Renewal Limit
        // ROBUST FIX: Count 'RENEW' actions for this copy/student that happened AFTER the original issue date.
        // This avoids relying on session_txn_id which might be shared or null.
        const renewalCount = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as count FROM transaction_logs 
                    WHERE student_id = ? AND copy_id = ? AND action_type = 'RENEW' AND timestamp > ?`,
                [loan.student_id, loan.copy_id, loan.issue_date],
                (err, row) => err ? reject(err) : resolve(row ? row.count : 0));
        });

        console.log(`[Renew Debug] Current Renewal Count (Timestamp-based): ${renewalCount}`);

        if (renewalCount >= maxRenewals) {
            return res.status(400).json({ error: `Max renewals reached (${renewalCount}/${maxRenewals})` });
        }

        // 4. Calculate New Due Date
        // User Request: "renew must count from due date" and "ask how many days"
        let newDueDateObj;

        if (req.body.extend_days) {
            const extendDays = parseInt(req.body.extend_days);
            // Calculate from CURRENT DUE DATE
            // Calculate from CURRENT DUE DATE
            const currentDueDate = new Date(loan.due_date);
            newDueDateObj = new Date(currentDueDate);
            newDueDateObj.setUTCDate(newDueDateObj.getUTCDate() + extendDays);
        } else if (new_due_date) {
            newDueDateObj = new Date(new_due_date);
        } else {
            // Default Fallback
            const currentDueDate = new Date(loan.due_date);
            newDueDateObj = new Date(currentDueDate);
            newDueDateObj.setUTCDate(newDueDateObj.getUTCDate() + renewalDays);
        }

        // Ensure end of day
        newDueDateObj.setUTCHours(23, 59, 59, 999);

        // 5. Update Circulation (State)
        const now = getISTDate();
        await new Promise((resolve, reject) => {
            db.run(`UPDATE circulation SET due_date = ?, last_renewed_date = ?, renewal_count = renewal_count + 1 WHERE id = ?`,
                [getISTISOWithOffset(newDueDateObj), getISTISOWithOffset(now), transaction_id],
                (err) => err ? reject(err) : resolve());
        });

        // 6. Log Transaction
        const studentDetails = await new Promise((resolve) => {
            db.get("SELECT full_name, register_number, dept_id FROM students WHERE id = ?", [loan.student_id], (err, row) => resolve(row));
        });
        const deptName = await new Promise((resolve) => {
            if (!studentDetails || !studentDetails.dept_id) resolve('');
            else db.get("SELECT name FROM departments WHERE id = ?", [studentDetails.dept_id], (err, row) => resolve(row ? row.name : ''));
        });

        const istDateRenew = getISTDate();
        const dateStrRenew = istDateRenew.toISOString().split('T')[0];
        const timeStrRenew = istDateRenew.toTimeString().split(' ')[0];

        await new Promise((resolve) => {
            db.run(`INSERT INTO transaction_logs (id, session_txn_id, action_type, student_id, student_name, student_reg_no, student_dept, copy_id, book_title, book_isbn, performed_by, details, timestamp) 
                    VALUES (?, ?, 'RENEW', ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+05:30'))`,
                [uuidv4(), loan.session_txn_id, loan.student_id, studentDetails?.full_name, studentDetails?.register_number, deptName, loan.copy_id, loan.title, loan.book_isbn || 'N/A', dbStaffId, JSON.stringify({
                    old_due_date: loan.due_date,
                    new_due_date: getISTISOWithOffset(newDueDateObj),
                    extend_days: req.body.extend_days || renewalDays,
                    accession: loan.accession_number,
                    author: loan.author,
                    publisher: loan.publisher,
                    action_date: dateStrRenew,
                    action_time: timeStrRenew
                })],
                () => resolve()
            );
        });

        const renewalsUsed = renewalCount + 1;

        const auditUser = req.user ? { id: req.user.id, role: req.user.role } : 'SYSTEM';
        auditService.log(auditUser, 'RENEW', 'Circulation', `Renewed book '${loan.title}' for ${studentDetails.full_name} (${studentDetails.register_number}). New Due Date: ${newDueDateObj.toISOString()}`, {
            old_due_date: loan.due_date,
            renewals_used: renewalsUsed
        });

        // Send Email Receipt
        db.get("SELECT full_name as name, email FROM students WHERE id = ?", [loan.student_id], (err, student) => {
            if (student && student.email) {
                emailService.sendTransactionReceipt('RENEW', student, {
                    title: loan.title,
                    new_due_date: newDueDateObj.toISOString(),
                    renewals_used: renewalsUsed
                });
            }
        });

        // Socket Emit
        socketService.emit('circulation_update', { type: 'RENEW', student_id: loan.student_id });

        res.json({
            message: "Book renewed successfully",
            new_due_date: newDueDateObj.toISOString(),
            renewals_used: renewalsUsed,
            max_renewals: maxRenewals
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/circulation/history
exports.getTransactionHistory = (req, res) => {
    const { search, status, limit = 1000 } = req.query;

    // IF status is 'Active', we want currently ISSUED books from 'circulation' table.
    // This allows the Return Page to verify what can actually be returned.
    if (status === 'Active') {
        let activeQuery = `
            SELECT c.id, c.id as transaction_id, c.issue_date, c.due_date, c.last_renewed_date, c.renewal_count, c.student_id,
                   'Active' as status,
                   s.full_name as student_name, s.register_number, d.name as department_name,
                   b.title as book_title, b.isbn, bc.accession_number
            FROM circulation c
            JOIN students s ON c.student_id = s.id
            LEFT JOIN departments d ON s.dept_id = d.id
            JOIN book_copies bc ON c.copy_id = bc.id
            JOIN books b ON bc.book_isbn = b.isbn
            WHERE 1=1
        `;

        const activeParams = [];

        if (search) {
            activeQuery += ` AND (s.full_name LIKE ? OR s.register_number LIKE ? OR b.title LIKE ? OR b.isbn LIKE ? OR bc.accession_number LIKE ? OR d.name LIKE ?)`;
            activeParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        const { department, startDate, endDate } = req.query;

        if (department && department !== 'All') {
            activeQuery += ` AND d.name = ?`;
            activeParams.push(department);
        }

        if (startDate) {
            activeQuery += ` AND DATE(c.issue_date) >= ?`;
            activeParams.push(startDate);
        }

        if (endDate) {
            activeQuery += ` AND DATE(c.issue_date) <= ?`;
            activeParams.push(endDate);
        }

        activeQuery += ` ORDER BY c.issue_date DESC LIMIT ?`;
        activeParams.push(limit);

        return db.all(activeQuery, activeParams, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    }

    // DEFAULT: Query 'transaction_logs' for history (ISSUE, RETURN, RENEW)
    let query = `
        SELECT l.id, l.session_txn_id, l.timestamp as date, l.action_type as status,
               COALESCE(s.full_name, l.student_name, json_extract(l.details, '$.student_name')) as student_name, 
               COALESCE(s.register_number, l.student_reg_no, json_extract(l.details, '$.student_reg_no'), json_extract(l.details, '$.roll_number')) as register_number, 
               COALESCE(d.name, l.student_dept, json_extract(l.details, '$.student_dept')) as department_name,
               COALESCE(b.title, l.book_title, json_extract(l.details, '$.book_title')) as book_title, 
               COALESCE(b.isbn, l.book_isbn, json_extract(l.details, '$.book_isbn')) as isbn, 
               COALESCE(c.accession_number, json_extract(l.details, '$.accession'), json_extract(l.details, '$.copy_accession')) as accession_number,
               l.details
        FROM transaction_logs l
        LEFT JOIN students s ON l.student_id = s.id
        LEFT JOIN departments d ON s.dept_id = d.id
        LEFT JOIN book_copies c ON l.copy_id = c.id
        LEFT JOIN books b ON c.book_isbn = b.isbn
        WHERE 1=1
    `;

    const params = [];

    if (status && status !== 'All') {
        query += ` AND l.action_type = ?`;
        params.push(status.toUpperCase());
    }

    const { isbn, student_id } = req.query;
    if (isbn) {
        // Strict match for ISBN if provided
        query += ` AND (COALESCE(b.isbn, l.book_isbn) = ?)`;
        params.push(isbn);
    }
    if (student_id) {
        // Strict match for Student ID
        query += ` AND (l.student_id = ?)`;
        params.push(student_id);
    }

    if (search) {
        query += ` AND (
            COALESCE(s.full_name, l.student_name) LIKE ? OR 
            COALESCE(s.register_number, l.student_reg_no) LIKE ? OR 
            COALESCE(b.title, l.book_title) LIKE ? OR 
            COALESCE(b.isbn, l.book_isbn) LIKE ? OR 
            c.accession_number LIKE ? OR 
            COALESCE(d.name, l.student_dept) LIKE ?
        )`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const { department, startDate, endDate } = req.query;

    if (department && department !== 'All') {
        const deptClause = `COALESCE(d.name, l.student_dept, json_extract(l.details, '$.student_dept'))`;
        query += ` AND ${deptClause} = ?`;
        params.push(department);
    }

    if (startDate) {
        // Safe date comparison using string prefix (YYYY-MM-DD)
        query += ` AND SUBSTR(l.timestamp, 1, 10) >= ?`;
        params.push(startDate);
    }

    if (endDate) {
        query += ` AND SUBSTR(l.timestamp, 1, 10) <= ?`;
        params.push(endDate);
    }

    query += ` ORDER BY REPLACE(l.timestamp, 'T', ' ') DESC LIMIT ?`;
    params.push(limit);

    console.log("[History Debug] Query:", query);
    console.log("[History Debug] Params:", params);

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const mappedRows = rows.map(r => ({
            ...r,
            issue_date: r.date,
            return_date: r.action_type === 'RETURN' ? r.date : null,
            due_date: null // Logs don't inherently have due dates unless extracted from detials
        }));

        res.json(mappedRows);
    });
};

// GET /api/circulation/search/students
exports.searchStudents = (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);

    db.all(
        `SELECT s.id, s.full_name, s.register_number, s.profile_image, d.name as department_name, d.code as department_code, s.semester 
         FROM students s
         LEFT JOIN departments d ON s.dept_id = d.id
         WHERE (s.full_name LIKE ? OR s.register_number LIKE ?) AND s.status = 'Active' 
         LIMIT 10`,
        [`%${q}%`, `%${q}%`],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
};

// GET /api/circulation/search/books
exports.searchBooks = (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);

    db.all(
        `SELECT isbn, title, author 
         FROM books 
         WHERE (title LIKE ? OR isbn LIKE ?) 
         LIMIT 10`,
        [`%${q}%`, `%${q}%`],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
};

// POST /api/circulation/resolve-scan
exports.resolveScan = (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "No code provided" });

    const normalizedCode = code.trim().toUpperCase();

    // 1. Check if it's a direct Accession Number (Copy ID)
    db.get(`SELECT id, accession_number, status, book_isbn FROM book_copies WHERE accession_number = ?`, [normalizedCode], (err, copy) => {
        if (err) return res.status(500).json({ error: err.message });

        if (copy) {
            // Found exact copy
            if (copy.status !== 'Available') {
                return res.status(400).json({ error: `Copy ${normalizedCode} is ${copy.status}` });
            }
            // Fetch book details for UI
            db.get(`SELECT title, cover_image, author FROM books WHERE isbn = ?`, [copy.book_isbn], (err, book) => {
                return res.json({
                    resolved: true,
                    type: 'ACCESSITEM',
                    value: copy.accession_number,
                    title: book ? book.title : "Copy found",
                    cover_image: book ? book.cover_image : null,
                    author: book ? book.author : null
                });
            });
            return;
        }

        // 2. Check if it's an ISBN
        db.get(`SELECT isbn, title, cover_image, author FROM books WHERE isbn = ?`, [normalizedCode], (err, book) => {
            if (err) return res.status(500).json({ error: err.message });

            if (book) {
                // It is a book. Find an AVAILABLE copy.
                db.get(`SELECT accession_number FROM book_copies WHERE book_isbn = ? AND status = 'Available' LIMIT 1`, [book.isbn], (err, availableCopy) => {
                    if (err) return res.status(500).json({ error: err.message });

                    if (!availableCopy) {
                        return res.status(400).json({ error: `Book found (${book.title}), but NO COPIES AVAILABLE.` });
                    }

                    return res.json({
                        resolved: true,
                        type: 'ISBN_RESOLVED',
                        value: availableCopy.accession_number,
                        title: book.title,
                        cover_image: book.cover_image,
                        author: book.author
                    });
                });
            } else {
                return res.status(404).json({ error: "No Book or Copy found with this code." });
            }
        });
    });
};

// GET /api/circulation/next-accession/:isbn
exports.getNextAccession = (req, res) => {
    const { isbn } = req.params;
    if (!isbn) return res.status(400).json({ error: "ISBN required" });

    // Pattern assumed: ISBN-SEQ (e.g. 9781234567890-001)
    db.all(`SELECT accession_number FROM book_copies WHERE book_isbn = ?`, [isbn], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        let maxSeq = 0;
        rows.forEach(row => {
            const parts = row.accession_number.split('-');
            if (parts.length > 1) {
                const seq = parseInt(parts[parts.length - 1]);
                if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
            }
        });

        const nextSeq = maxSeq + 1;
        const nextSeqStr = nextSeq.toString().padStart(3, '0'); // 001, 002...
        const nextAccession = `${isbn}-${nextSeqStr}`;

        res.json({ next_accession: nextAccession });
    });
};
// GET /api/circulation/holders/:isbn
exports.getBookActiveLoans = (req, res) => {
    const { isbn } = req.params;

    const query = `
        SELECT c.id as transaction_id, c.issue_date, c.due_date, 
               bc.accession_number, s.full_name as student_name, s.register_number, 
               d.name as department_name,
               (julianday(datetime('now', '+05:30')) - julianday(c.due_date)) as overdue_days
        FROM circulation c
        JOIN book_copies bc ON c.copy_id = bc.id
        JOIN students s ON c.student_id = s.id
        LEFT JOIN departments d ON s.dept_id = d.id
        WHERE bc.book_isbn = ?
        ORDER BY c.due_date ASC
    `;

    db.all(query, [isbn], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

// GET /api/circulation/policy-defaults
// Returns policy values for frontend to pre-populate editable fields
exports.getPolicyDefaults = async (req, res) => {
    try {
        const [policyBorrowing, policyFinancial] = await Promise.all([
            getSetting('policy_borrowing', {}),
            getSetting('policy_financial', {})
        ]);

        const studentPolicy = policyBorrowing['student'] || {};

        res.json({
            renewalDays: parseInt(studentPolicy.renewalDays) || parseInt(studentPolicy.loanDays) || 15,
            maxRenewals: parseInt(studentPolicy.maxRenewals) || 1,
            dailyFineRate: parseFloat(policyFinancial.dailyFineRate) || 1.00,
            damagedFineAmount: parseFloat(policyFinancial.damagedFineAmount) || 100,
            lostFineAmount: parseFloat(policyFinancial.lostFineAmount) || 500,
            maxFinePerStudent: parseFloat(policyFinancial.maxFinePerStudent) || 1000
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/circulation/issued-students
// Returns all students who currently have active loans (books issued)
// Supports search by name or register number
exports.getIssuedStudents = (req, res) => {
    const { q } = req.query;

    let query = `
        SELECT 
            s.id, s.full_name, s.register_number, s.semester, s.profile_image,
            d.name as department_name, d.code as department_code,
            COUNT(c.id) as books_issued,
            SUM(CASE WHEN julianday(datetime('now', '+05:30')) > julianday(c.due_date) THEN 1 ELSE 0 END) as overdue_count,
            MAX(c.issue_date) as latest_issue_date
        FROM students s
        JOIN circulation c ON s.id = c.student_id
        LEFT JOIN departments d ON s.dept_id = d.id
    `;

    const params = [];

    if (q) {
        query += ` WHERE (s.full_name LIKE ? OR s.register_number LIKE ?)`;
        params.push(`%${q}%`, `%${q}%`);
    }

    query += ` GROUP BY s.id ORDER BY latest_issue_date DESC`;

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

