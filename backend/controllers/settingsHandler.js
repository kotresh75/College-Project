const db = require('../db');
const bcrypt = require('bcryptjs');
// eslint-disable-next-line
const { v4: uuidv4 } = require('uuid');
const auditService = require('../services/auditService');
const socketService = require('../services/socketService');

// Get All App Settings
exports.getAppSettings = (req, res) => {
    // Fetch categories: App, Data, Email, Security
    // Exclude 'Policy' which is for the Policy Page
    db.all("SELECT * FROM system_settings WHERE category IN ('App', 'Data', 'Email', 'Security')", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const settings = {};
        rows.forEach(row => {
            try {
                if (row.data_type === 'json') {
                    settings[row.key] = JSON.parse(row.value);
                } else {
                    settings[row.key] = row.value;
                }
            } catch (e) {
                settings[row.key] = row.value;
            }
        });
        res.json(settings);
    });
};

// Update App Settings
exports.updateAppSettings = async (req, res) => {
    try {
        const { updates, admin_password, admin_id } = req.body;

        console.log("[Settings] updateAppSettings called with keys:", updates ? Object.keys(updates) : 'none');

        // Validate updates object
        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ error: "No updates provided (ERR_SET_NO_DATA)" });
        }

        const keys = Object.keys(updates);

        // If no keys to update, just return success
        if (keys.length === 0) {
            return res.json({ success: true, message: "No changes to save" });
        }

        // Check if sensitive categories are being updated
        const sensitivePrefixes = ['sec_', 'email_', 'backup_'];
        const isSensitive = keys.some(k => sensitivePrefixes.some(pre => k.startsWith(pre)));

        if (isSensitive) {
            if (!admin_password) return res.status(400).json({ error: "Admin password required for sensitive settings (ERR_SET_AUTH)" });
            if (!admin_id) return res.status(400).json({ error: "Admin ID required (ERR_SET_ID)" });

            console.log(`[Settings] Verifying admin ID: ${admin_id}`);

            // Verify Password - check admins table (not staff)
            const admin = await new Promise((resolve, reject) => {
                db.get("SELECT id, email, password_hash FROM admins WHERE id = ?", [admin_id], (err, row) => {
                    if (err) reject(err); else resolve(row);
                });
            });

            console.log(`[Settings] Admin found:`, admin ? 'yes' : 'no', 'has password_hash:', admin?.password_hash ? 'yes' : 'no');

            if (!admin) return res.status(403).json({ error: "Unauthorized - admin not found (ERR_SET_UNAUTH)" });
            if (!admin.password_hash) return res.status(500).json({ error: "Admin password not set (ERR_SET_PWD_MISSING)" });

            const match = await bcrypt.compare(admin_password, admin.password_hash);
            if (!match) return res.status(401).json({ error: "Invalid Password (ERR_SET_PWD)" });

            // Store admin info for audit logging
            req.adminForAudit = { id: admin.email, role: 'Admin' };
        }

        // Proceed Update - using Promise to properly handle async
        return new Promise((resolve) => {
            db.serialize(() => {
                db.run("BEGIN TRANSACTION");

                let completed = 0;
                let errorOccurred = false;
                let errorDetails = null;

                const checkCompletion = () => {
                    if (completed === keys.length) {
                        if (errorOccurred) {
                            db.run("ROLLBACK", () => {
                                res.status(500).json({ error: `Update failed: ${errorDetails} (ERR_SET_DB)` });
                                resolve();
                            });
                        } else {
                            // Log Audit with proper user info
                            if (req.adminForAudit) {
                                auditService.log(req.adminForAudit, 'UPDATE_SETTINGS', 'Settings', `Updated keys: ${keys.join(', ')}`);
                            } else if (admin_id) {
                                auditService.log(admin_id, 'UPDATE_SETTINGS', 'Settings', `Updated keys: ${keys.join(', ')}`);
                            }

                            db.run("COMMIT", () => {
                                socketService.emit('settings_update', { type: 'UPDATE', keys });
                                res.json({ success: true });
                                resolve();
                            });
                        }
                    }
                };

                keys.forEach(key => {
                    let value = updates[key];
                    if (typeof value === 'object') value = JSON.stringify(value);

                    db.run("UPDATE system_settings SET value = ? WHERE key = ?", [value, key], function (err) {
                        if (err) {
                            console.error(`[Settings] Error updating key '${key}':`, err.message);
                            errorOccurred = true;
                            errorDetails = err.message;
                            completed++;
                            checkCompletion();
                        } else if (this.changes === 0) {
                            // UPSERT: If row doesn't exist, insert it
                            let category = 'App';
                            if (key.startsWith('sec_')) category = 'Security';
                            else if (key.startsWith('email_')) category = 'Email';
                            else if (key.startsWith('backup_')) category = 'Data';

                            let dataType = typeof value === 'object' ? 'json' : 'string';
                            if (typeof updates[key] === 'boolean') dataType = 'boolean';
                            else if (typeof updates[key] === 'number') dataType = 'number';

                            db.run("INSERT INTO system_settings (key, value, category, data_type, description) VALUES (?, ?, ?, ?, ?)",
                                [key, value, category, dataType, `Auto-created setting for ${key}`],
                                function (insertErr) {
                                    if (insertErr) {
                                        console.error(`[Settings] Error inserting key '${key}':`, insertErr.message);
                                        errorOccurred = true;
                                        errorDetails = insertErr.message;
                                    } else {
                                        console.log(`[Settings] Inserted new key '${key}'`);
                                    }
                                    completed++;
                                    checkCompletion();
                                });
                        } else {
                            completed++;
                            console.log(`[Settings] Updated '${key}': ${this.changes} rows affected`);
                            checkCompletion();
                        }
                    });
                });
            });
        });
    } catch (error) {
        console.error("[Settings] Server error:", error);
        res.status(500).json({ error: "Server error updating settings (ERR_SET_SRV)" });
    }
};

// Change Password (User specific)
exports.changeUserPassword = async (req, res) => {
    const { user_id, current_password, new_password } = req.body;

    db.get("SELECT password_hash FROM staff WHERE id = ?", [user_id], async (err, user) => {
        if (err || !user) return res.status(404).json({ error: "User not found" });

        const match = await bcrypt.compare(current_password, user.password_hash);
        if (!match) return res.status(401).json({ error: "Current password incorrect" });

        const hashed = await bcrypt.hash(new_password, 10);
        db.run("UPDATE staff SET password_hash = ? WHERE id = ?", [hashed, user_id], (err) => {
            if (err) return res.status(500).json({ error: "Failed to update password" });

            res.json({ success: true });
        });
    });
};

// Test Email
exports.testEmail = async (req, res) => {
    const { email } = req.body;
    const nodemailer = require('nodemailer');

    // Get email config from database
    db.get("SELECT value FROM system_settings WHERE key = 'email_config'", [], async (err, row) => {
        if (err || !row) {
            return res.status(500).json({ error: "Email configuration not found (ERR_EMAIL_CFG)" });
        }

        try {
            const config = JSON.parse(row.value);

            if (!config.enabled) {
                return res.status(400).json({ error: "Email service is disabled (ERR_EMAIL_TEST)" });
            }

            // Create transporter based on provider
            let transporter;

            if (config.provider === 'smtp') {
                // Fix common typo: smpt -> smtp
                const host = config.host === 'smpt.gmail.com' ? 'smtp.gmail.com' : config.host;

                transporter = nodemailer.createTransport({
                    host: host,
                    port: parseInt(config.port) || 587,
                    secure: config.secure || config.port === 465,
                    auth: {
                        user: config.user,
                        pass: config.pass
                    }
                });
            } else {
                // For other providers (sendgrid, aws_ses) - would need SDK
                return res.status(400).json({ error: `Provider '${config.provider}' not implemented yet (ERR_EMAIL_PROVIDER)` });
            }

            // Verify connection
            try {
                await transporter.verify();
                console.log("[Email] SMTP connection verified successfully");
            } catch (verifyErr) {
                console.error("[Email] SMTP verification failed:", verifyErr.message);
                return res.status(500).json({
                    error: `SMTP connection failed: ${verifyErr.message} (ERR_EMAIL_CONN)`
                });
            }

            // Send test email
            const targetEmail = email || config.user;
            const mailOptions = {
                from: `"${config.fromName || 'GPTK Library'}" <${config.user}>`,
                to: targetEmail,
                subject: 'GPTK LMS - Test Email',
                text: 'This is a test email from GPTK Library Management System. If you received this, your email configuration is working correctly!',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
                        <h2 style="color: #3b82f6;">✅ Test Email Successful!</h2>
                        <p>This is a test email from <strong>GPTK Library Management System</strong>.</p>
                        <p>If you received this, your email configuration is working correctly!</p>
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                        <p style="color: #6b7280; font-size: 12px;">
                            Sent from: ${config.fromName || 'GPTK Library'}<br>
                            Provider: ${config.provider.toUpperCase()}<br>
                            Host: ${config.host}
                        </p>
                    </div>
                `
            };

            const info = await transporter.sendMail(mailOptions);
            console.log("[Email] Test email sent successfully:", info.messageId);

            res.json({
                success: true,
                message: `Test email sent to ${targetEmail}`,
                messageId: info.messageId
            });

        } catch (e) {
            console.error("[Email] Test email error:", e);
            res.status(500).json({ error: `Failed to send test email: ${e.message} (ERR_EMAIL_SEND)` });
        }
    });
};

// --- Cloud Backup Handlers ---
const cloudBackupService = require('../services/cloudBackupService');

exports.testCloudConnection = async (req, res) => {
    const { uri } = req.body;
    try {
        await cloudBackupService.testConnection(uri);
        res.json({ success: true, message: "Connection successful" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createLocalBackup = async (req, res) => {
    const tables = [
        'departments', 'students', 'staff', 'admins', 'books', 'book_copies',
        'circulation', 'transaction_logs', 'fines', 'broadcast_logs', 'audit_logs',
        'system_settings', 'policy_config', 'email_config'
    ];

    const data = {};
    const promises = tables.map(table => {
        return new Promise((resolve) => {
            db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
                if (!err) data[table] = rows;
                resolve();
            });
        });
    });

    await Promise.all(promises);

    const backup = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        data: data
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=backup-${Date.now()}.json`);
    res.send(JSON.stringify(backup, null, 2));
};

exports.triggerCloudBackup = async (req, res) => {
    // Manual trigger
    const result = await cloudBackupService.performCloudBackup();
    if (result.success) {
        res.json({ success: true, message: "Backup completed successfully" });
    } else {
        res.status(500).json({ error: result.error });
    }
};

exports.triggerCloudRestore = async (req, res) => {
    const { admin_id, admin_password } = req.body;

    if (!admin_id || !admin_password) {
        return res.status(400).json({ error: "Admin authentication required" });
    }

    try {
        // Verify Admin
        const admin = await new Promise((resolve, reject) => {
            db.get("SELECT id, password_hash FROM admins WHERE id = ?", [admin_id], (err, row) => {
                if (err) reject(err); else resolve(row);
            });
        });

        if (!admin || !admin.password_hash) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const match = await bcrypt.compare(admin_password, admin.password_hash);
        if (!match) {
            return res.status(401).json({ error: "Invalid Admin Password" });
        }

        // Proceed with Restore
        const result = await cloudBackupService.restoreFromCloud();
        if (result.success) {
            res.json({ success: true, message: "Data restored from cloud" });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (e) {
        console.error("Cloud Restore Auth Error:", e);
        res.status(500).json({ error: "Server error during verification" });
    }
};

exports.factoryReset = async (req, res) => {
    const { admin_id, admin_password } = req.body;

    if (!admin_id || !admin_password) {
        return res.status(400).json({ error: "Admin authentication required" });
    }

    try {
        // 1. Verify Admin
        const admin = await new Promise((resolve, reject) => {
            db.get("SELECT id, password_hash FROM admins WHERE id = ?", [admin_id], (err, row) => {
                if (err) reject(err); else resolve(row);
            });
        });

        if (!admin || !admin.password_hash) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const match = await bcrypt.compare(admin_password, admin.password_hash);
        if (!match) {
            return res.status(401).json({ error: "Invalid Admin Password" });
        }

        // 2. Perform Wipe
        // Order matters for FKs, but we'll also disable FKs temporarily to be sure
        const tablesToClear = [
            // Child tables first
            'fines', 'circulation', 'transaction_logs', 'notifications', 'activity_logs',
            // Content tables
            'book_copies', 'books', 'students', 'departments', 'staff',
            // Admin & Auth
            'admins',
            // Logs
            'audit_logs', 'broadcast_logs',
            // Settings & Policies (re-seeded with defaults on next restart)
            'system_settings', 'policy_config'
        ];

        // Use transaction
        db.serialize(() => {
            // Disable Foreign Keys for the wipe
            db.run("PRAGMA foreign_keys = OFF");
            db.run("BEGIN TRANSACTION");

            tablesToClear.forEach(table => {
                db.run(`DELETE FROM ${table}`, (err) => {
                    // Ignore "no such table" errors, verify others
                    if (err && !err.message.includes('no such table')) {
                        console.error(`Failed to clear ${table}:`, err.message);
                    }
                });
                db.run(`DELETE FROM sqlite_sequence WHERE name='${table}'`, (err) => {
                    // Start fresh if sqlite_sequence doesn't exist (it is created automatically when needed)
                    // We ignore 'no such table' errors here.
                    if (err && !err.message.includes('no such table')) {
                        console.warn(`[Reset] Note: Could not reset sequence for ${table}:`, err.message);
                    }
                });
            });

            // 3. Disable Auto-Backup explicitly (Robust Method)
            // We use a direct JSON update approach supported by SQLite JSON1 extension if available,
            // or fallback to textual replacement which we know works for simple bools.
            // Since previous read-modify-write might have raced or failed, let's try the direct SQL update again 
            // BUT with a safer pattern, OR just rewrite the reading logic to be sure it runs.

            // Let's stick to the read-modify-write but ensure it EXECUTES.
            db.get("SELECT value FROM system_settings WHERE key = 'backup_config'", (err, row) => {
                if (!err && row) {
                    try {
                        let config = JSON.parse(row.value);
                        config.autoBackup = false;
                        // We run the update immediately
                        db.run("UPDATE system_settings SET value = ? WHERE key = 'backup_config'", [JSON.stringify(config)]);
                    } catch (e) {
                        console.error("Failed to disable auto-backup:", e);
                    }
                }
            });

            // 4. Prevent Auto-Backup of Empty DB (Session)
            const changeDetection = require('../services/changeDetection');
            changeDetection.reset();

            db.run("COMMIT", (err) => {
                // Re-enable Foreign Keys
                db.run("PRAGMA foreign_keys = ON");

                if (err) {
                    console.error("Reset Commit Failed:", err);
                    return res.status(500).json({ error: "Reset failed during commit" });
                }

                // 4. Log the final action (New log starts now)
                auditService.log(admin_id, 'SYSTEM_RESET', 'System', 'Performed Factory Reset. All data wiped.');

                res.json({ success: true, message: "System Reset Successful" });
            });
        });

    } catch (e) {
        console.error("Factory Reset Error:", e);
        res.status(500).json({ error: "Server error during reset" });
    }
};

// --- Principal Signature Handlers ---

// Get Principal Signature
exports.getPrincipalSignature = (req, res) => {
    db.get("SELECT value FROM system_settings WHERE key = 'principal_signature'", [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ signature: row?.value || null });
    });
};

// Upload Principal Signature
exports.uploadPrincipalSignature = (req, res) => {
    const { image_data } = req.body;

    if (!image_data) {
        return res.status(400).json({ error: "No signature image provided" });
    }

    // Validate Base64 image data
    if (!image_data.startsWith('data:image/')) {
        return res.status(400).json({ error: "Invalid image format. Must be Base64 encoded image." });
    }

    // Check if setting exists, if not insert, else update - using 'key' instead of 'id'
    db.get("SELECT key FROM system_settings WHERE key = 'principal_signature'", [], (err, row) => {
        if (err) {
            console.error("[Principal Signature] DB Error checking existence:", err.message);
            return res.status(500).json({ error: err.message });
        }

        if (row) {
            // Update
            db.run("UPDATE system_settings SET value = ? WHERE key = 'principal_signature'",
                [image_data], function (err) {
                    if (err) {
                        console.error("[Principal Signature] Update Error:", err.message);
                        return res.status(500).json({ error: err.message });
                    }
                    console.log("[Principal Signature] Updated successfully");
                    socketService.emit('settings_update', { type: 'UPDATE', keys: ['principal_signature'] });
                    res.json({ message: "Principal signature uploaded successfully" });
                });
        } else {
            // Insert - using only columns that exist in older schema
            db.run("INSERT INTO system_settings (key, value, category, data_type, description) VALUES (?, ?, ?, ?, ?)",
                ['principal_signature', image_data, 'App', 'string', 'Principal signature image for ID cards'],
                function (err) {
                    if (err) {
                        console.error("[Principal Signature] Insert Error:", err.message);
                        return res.status(500).json({ error: err.message });
                    }
                    console.log("[Principal Signature] Inserted successfully");
                    socketService.emit('settings_update', { type: 'UPDATE', keys: ['principal_signature'] });
                    res.json({ message: "Principal signature uploaded successfully" });
                });
        }
    });
};

// Delete Principal Signature
exports.deletePrincipalSignature = (req, res) => {
    db.run("UPDATE system_settings SET value = NULL WHERE key = 'principal_signature'",
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            socketService.emit('settings_update', { type: 'UPDATE', keys: ['principal_signature'] });
            res.json({ message: "Principal signature deleted successfully" });
        });
};

