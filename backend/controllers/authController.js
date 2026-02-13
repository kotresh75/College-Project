const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db');
const auditService = require('../services/auditService');
const { getISTISOWithOffset } = require('../utils/dateUtils');

// SECRET should eventually check system_settings, but for now we fallback
const JWT_SECRET = 'gptk_lms_secret_temporary_key';

// GET /api/auth/setup-status — Check if any admin exists
exports.setupStatus = (req, res) => {
    db.get("SELECT COUNT(*) as count FROM admins", (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ needsSetup: row.count === 0 });
    });
};

// POST /api/auth/setup — Create the first admin (only works when 0 admins exist)
exports.setupAdmin = (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Only allow if 0 admins exist
    db.get("SELECT COUNT(*) as count FROM admins", (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row.count > 0) {
            return res.status(403).json({ error: 'Setup already completed. An admin already exists.' });
        }

        const saltRounds = 10;
        bcrypt.hash(password, saltRounds, (err, hash) => {
            if (err) return res.status(500).json({ error: 'Encryption error' });

            const { v4: uuidv4 } = require('uuid');
            const id = uuidv4();
            const createdAt = getISTISOWithOffset();

            db.run(
                "INSERT INTO admins (id, name, email, password_hash, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                [id, name, email, hash, 'Active', createdAt],
                function (err) {
                    if (err) {
                        if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email already exists' });
                        return res.status(500).json({ error: err.message });
                    }

                    // Generate JWT for immediate login
                    const token = jwt.sign(
                        { id, email, role: 'Admin' },
                        JWT_SECRET,
                        { expiresIn: '12h' }
                    );

                    // Audit
                    auditService.log(
                        { id, role: 'Admin', email },
                        'SETUP',
                        'Auth',
                        `Initial admin created during setup: ${name} (${email})`,
                        { ip: req.ip }
                    );

                    res.json({
                        message: 'Admin created successfully',
                        token,
                        user: { id, name, email, role: 'Admin' }
                    });
                }
            );
        });
    });
};

exports.login = (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required', error_code: 'ERR_MISSING_FIELDS' });
    }

    // Common response helper
    const sendError = (status, message, code, field) => {
        // Audit log for failure
        auditService.log(
            email,
            'LOGIN_FAILED',
            'Auth',
            `Login failed: ${message}`,
            { ip: req.ip, reason: code }
        );
        return res.status(status).json({ message, error_code: code, field });
    };

    const verifyUser = (user, roleRaw) => {
        // 1. Check Status
        if (user.status !== 'Active') {
            return sendError(403, 'Your account is disabled. Contact Admin.', 'ERR_ACCOUNT_DISABLED', 'email');
        }

        // 2. Check Password
        bcrypt.compare(password, user.password_hash, (err, isMatch) => {
            if (err) return res.status(500).json({ message: 'Authentication error' });

            if (!isMatch) {
                return sendError(401, 'Incorrect password', 'ERR_WRONG_PASSWORD', 'password');
            }

            // Success
            const role = roleRaw || user.role || (roleRaw === 'admin' ? 'Admin' : 'Staff');

            // Generate Token
            const token = jwt.sign(
                { id: user.id, email: user.email, role: role },
                JWT_SECRET,
                { expiresIn: '12h' }
            );

            // Update Last Login
            const table = role === 'Admin' ? 'admins' : 'staff';
            db.run(`UPDATE ${table} SET last_login = datetime('now', '+05:30') WHERE id = ?`, [user.id]);

            // Audit Success
            auditService.log(
                { id: user.id, role: role, email: user.email },
                'LOGIN',
                'Auth',
                `User logged in: ${user.email}`,
                { ip: req.ip }
            );

            res.json({
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: role,
                    designation: user.designation,
                    permissions: user.access_permissions ? JSON.parse(user.access_permissions) : []
                }
            });
        });
    };

    // 1. Check Admins Table (Find by Email only first)
    db.get("SELECT id, name, email, password_hash, status, 'Admin' as role FROM admins WHERE email = ?", [email], (err, admin) => {
        if (err) return res.status(500).json({ message: 'Database error' });

        if (admin) {
            return verifyUser(admin, 'Admin');
        }

        // 2. If not in Admins, Check Staff Table
        db.get("SELECT id, name, email, password_hash, status, designation, access_permissions, 'Staff' as role FROM staff WHERE email = ?", [email], (err, staff) => {
            if (err) return res.status(500).json({ message: 'Database error' });

            if (staff) {
                const role = staff.email === 'system@library.com' ? 'Admin' : 'Staff';
                return verifyUser(staff, role);
            }

            // User Not Found
            return sendError(404, 'User not found', 'ERR_USER_NOT_FOUND', 'email');
        });
    });
};
// --- Forgot Password Logic ---

exports.requestPasswordReset = (req, res) => {
    const { email } = req.body;
    const nodemailer = require('nodemailer');

    // 1. First Check if Email Service is Enabled
    db.get("SELECT value FROM system_settings WHERE key = 'email_config'", [], (err, row) => {
        if (err) return res.status(500).json({ message: 'Database error' });

        // Parse config or default to disabled
        let config = { enabled: false };
        if (row && row.value) {
            try { config = JSON.parse(row.value); } catch (e) { }
        }

        if (!config.enabled) {
            return res.status(503).json({
                message: 'Email services are disabled for security purposes.',
                error_code: 'ERR_EMAIL_DISABLED'
            });
        }

        // 2. Audit Request
        auditService.log(email, 'PASSWORD_RESET_REQUEST', 'Auth', `Password reset requested for ${email}`, { ip: req.ip });

        // 3. Check if user exists (Admins only for now, can extend to Staff)
        db.get("SELECT id FROM admins WHERE email = ?", [email], (err, user) => {
            if (err) return res.status(500).json({ message: 'Database error' });
            if (!user) return res.status(404).json({ message: 'Email not found in our records.' });

            // Generate 6-digit OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = getISTISOWithOffset(new Date(Date.now() + 10 * 60000)); // 10 mins

            // Store OTP
            db.run("INSERT OR REPLACE INTO password_resets (email, otp, expires_at) VALUES (?, ?, ?)",
                [email, otp, expiresAt],
                async (err) => {
                    if (err) return res.status(500).json({ message: 'Failed to generate OTP' });

                    // Send Email using already fetched config
                    // Connectivity Check
                    const dns = require('dns').promises;
                    let isOnline = true;
                    try {
                        await dns.lookup('google.com');
                    } catch (e) {
                        isOnline = false;
                    }

                    if (!isOnline) {
                        return res.status(503).json({
                            message: 'System is offline. Cannot send OTP.',
                            error_code: 'ERR_NETWORK_OFFLINE'
                        });
                    }

                    try {
                        let emailSent = false;
                        if (config.provider === 'smtp') {
                            const host = config.host === 'smpt.gmail.com' ? 'smtp.gmail.com' : config.host;

                            const transporter = nodemailer.createTransport({
                                host: host,
                                port: parseInt(config.port) || 587,
                                secure: config.secure || config.port === 465,
                                auth: { user: config.user, pass: config.pass }
                            });

                            const mailOptions = {
                                from: `"${config.fromName || 'GPTK Library'}" <${config.user}>`,
                                to: email,
                                subject: 'Password Reset OTP - GPTK Library',
                                text: `Your OTP for password reset is: ${otp}\n\nThis code expires in 10 minutes.`,
                                html: `
                                    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
                                        <h2 style="color: #3b82f6;">Password Reset Request</h2>
                                        <p>Your OTP for password reset is:</p>
                                        <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                                            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937;">${otp}</span>
                                        </div>
                                        <p style="color: #6b7280;">This code expires in 10 minutes.</p>
                                    </div>
                                `
                            };

                            await transporter.sendMail(mailOptions);
                            emailSent = true;
                        }

                        res.json({ message: 'OTP sent to your email.', emailSent });

                    } catch (emailErr) {
                        console.error('[Email] Failed to send OTP:', emailErr.message);
                        res.status(500).json({ message: 'Failed to send email. Check server logs.' });
                    }
                }
            );
        });
    });
};


exports.verifyOTP = (req, res) => {
    const { email, otp } = req.body;

    db.get("SELECT * FROM password_resets WHERE email = ? AND otp = ?", [email, otp], (err, record) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (!record) return res.status(400).json({ message: 'Invalid OTP' });

        if (new Date(record.expires_at) < new Date()) {
            return res.status(400).json({ message: 'OTP expired' });
        }

        res.json({ message: 'OTP verified successfully' });
    });
};

exports.resetPassword = (req, res) => {
    const { email, otp, newPassword } = req.body;

    // Double check OTP validity
    db.get("SELECT * FROM password_resets WHERE email = ? AND otp = ?", [email, otp], (err, record) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (!record || new Date(record.expires_at) < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired OTP request' });
        }

        // Hash new password
        const saltRounds = 10;
        bcrypt.hash(newPassword, saltRounds, (err, hash) => {
            if (err) return res.status(500).json({ message: 'Encryption failed' });

            // Update Admin Password
            db.run("UPDATE admins SET password_hash = ? WHERE email = ?", [hash, email], (err) => {
                if (err) return res.status(500).json({ message: 'Failed to update password' });

                // Clear OTP
                db.run("DELETE FROM password_resets WHERE email = ?", [email]);

                // Audit Reset Success
                auditService.log(email, 'PASSWORD_RESET_SUCCESS', 'Auth', `Password successfully reset for ${email}`, { ip: req.ip });

                res.json({ message: 'Password updated successfully. Please login.' });
            });
        });
    });
};

exports.changePassword = (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const { id, role } = req.user; // from verifyToken middleware

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: 'Old and new passwords are required' });
    }

    // Special handling for System Administrator who has Admin role but is in staff table
    let table = role === 'Admin' ? 'admins' : 'staff';
    if (id === 'SYSTEM') table = 'staff';

    // 1. Get current user to verify old password (using generic query to handle both tables if ID is unique globally, or use table)
    // Safe to use table variable derived from token role
    db.get(`SELECT password_hash FROM ${table} WHERE id = ?`, [id], (err, user) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (!user) return res.status(404).json({ message: 'User not found' });

        bcrypt.compare(oldPassword, user.password_hash, (err, isMatch) => {
            if (err) return res.status(500).json({ message: 'Authentication error' });
            if (!isMatch) return res.status(401).json({ message: 'Incorrect old password' });

            // 2. Hash new password
            const saltRounds = 10;
            bcrypt.hash(newPassword, saltRounds, (err, hash) => {
                if (err) return res.status(500).json({ message: 'Encryption failed' });

                // 3. Update Password
                db.run(`UPDATE ${table} SET password_hash = ? WHERE id = ?`, [hash, id], (err) => {
                    if (err) return res.status(500).json({ message: 'Failed to update password' });

                    auditService.log(req.user, 'PASSWORD_CHANGE', 'Auth', `User changed their password`);
                    res.json({ message: 'Password changed successfully' });
                });
            });
        });
    });
};
