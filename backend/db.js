const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { getISTISOWithOffset } = require('./utils/dateUtils');

// Production: Use AppData folder for writable database
const isDev = process.env.NODE_ENV !== 'production' && !process.resourcesPath?.includes('app.asar');

// Unified Path Logic: Prefer path injected from Electron
const userDataPath = process.env.USER_DATA_PATH || (isDev
    ? path.resolve(__dirname, '..')
    : path.join(process.env.APPDATA || process.env.HOME, 'GPTK Library Manager'));

const dbPath = path.join(userDataPath, 'DB', 'lms.sqlite');
const uploadsPath = path.join(userDataPath, 'Uploads');
const dbDir = path.dirname(dbPath);

// Ensure directories exist
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
}

console.log('Database path:', dbPath);
console.log('Uploads path:', uploadsPath);

// Export paths for other modules
module.exports.uploadsPath = uploadsPath;
module.exports.dbPath = dbPath;

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('Connected to SQLite database at', dbPath);
        // Enable Foreign Keys
        db.run('PRAGMA foreign_keys = ON;', (err) => {
            if (err) console.error("Failed to enable Foreign Keys:", err);
            else {
                initializeTables();

                // DATA REPAIR: Fix missing IDs for copies created before the fix
                db.run("UPDATE book_copies SET id = lower(hex(randomblob(16))) WHERE id IS NULL", (err) => {
                    if (!err && this.changes > 0) console.log("Fixed missing IDs for book_copies");
                });
                // DATA REPAIR: Fix missing IDs for books created before the fix
                db.run("UPDATE books SET id = lower(hex(randomblob(16))) WHERE id IS NULL", (err) => {
                    if (!err && this.changes > 0) console.log("Fixed missing IDs for books");
                });



                // SCHEMA MIGRATION: Add profile_image to students if not exists
                db.run("ALTER TABLE students ADD COLUMN profile_image TEXT", (err) => {
                    // Ignore error if column already exists
                });

                // SCHEMA MIGRATION: Add dept_id to books if not exists (Critical Fix)
                db.run("ALTER TABLE books ADD COLUMN dept_id TEXT REFERENCES departments(id)", (err) => {
                    if (!err) console.log("Added dept_id column to books table");
                });

                // SCHEMA MIGRATION: Add cover_image_url to books if not exists
                db.run("ALTER TABLE books ADD COLUMN cover_image_url TEXT", (err) => {
                    if (!err) console.log("Added cover_image_url column to books table");
                });

                // SCHEMA MIGRATION: Add shelf_location to books if not exists
                db.run("ALTER TABLE books ADD COLUMN shelf_location TEXT", (err) => {
                    if (!err) console.log("Added shelf_location column to books table");
                });

                // SCHEMA MIGRATION: Add status to books if not exists
                db.run("ALTER TABLE books ADD COLUMN status TEXT CHECK(status IN ('Active', 'Deleted', 'Archived')) DEFAULT 'Active'", (err) => {
                    if (!err) console.log("Added status column to books table");
                });

                // SCHEMA MIGRATION: Add cover_image to books if not exists
                db.run("ALTER TABLE books ADD COLUMN cover_image TEXT", (err) => {
                    // DATA MIGRATION: Copy old url to new column if successful or if column exists
                    db.run("UPDATE books SET cover_image = cover_image_url WHERE cover_image IS NULL AND cover_image_url IS NOT NULL", (err) => {
                        if (!err && this.changes > 0) console.log("Migrated cover_image_url to cover_image");
                    });
                });

                // SCHEMA MIGRATION: Add father_name to students if not exists
                db.run("ALTER TABLE students ADD COLUMN father_name TEXT", (err) => {
                    if (!err) console.log("Added father_name column to students table");
                });

                // SCHEMA MIGRATION: Add book_isbn to book_copies if not exists
                db.run("ALTER TABLE book_copies ADD COLUMN book_isbn TEXT REFERENCES books(isbn)", (err) => {
                    if (!err) console.log("Added book_isbn column to book_copies table");
                });

                // SCHEMA MIGRATION: Add hod_signature to departments if not exists
                db.run("ALTER TABLE departments ADD COLUMN hod_signature TEXT", (err) => {
                    if (!err) console.log("Added hod_signature column to departments table");
                });

                // SCHEMA MIGRATION: Add requires_restart to system_settings if not exists
                db.run("ALTER TABLE system_settings ADD COLUMN requires_restart INTEGER DEFAULT 0", (err) => {
                    if (!err) console.log("Added requires_restart column to system_settings table");
                });

                // SCHEMA MIGRATION: Add profile_icon to admins if not exists
                db.run("ALTER TABLE admins ADD COLUMN profile_icon TEXT", (err) => {
                    if (!err) console.log("Added profile_icon column to admins table");
                });

                // SCHEMA MIGRATION: Add profile_icon to staff if not exists
                db.run("ALTER TABLE staff ADD COLUMN profile_icon TEXT", (err) => {
                    if (!err) console.log("Added profile_icon column to staff table");
                });

                // SCHEMA MIGRATION: Add id to system_settings if not exists (Fix for legacy schema)
                db.run("ALTER TABLE system_settings ADD COLUMN id TEXT", (err) => {
                    // Start assuming UUIDs if we are adding this column now, or random IDs
                    if (!err) {
                        console.log("Added id column to system_settings table");
                        // Backfill IDs
                        db.run("UPDATE system_settings SET id = lower(hex(randomblob(16))) WHERE id IS NULL");
                    }
                });

                // SCHEMA MIGRATION: Add actor_email to audit_logs
                db.run("ALTER TABLE audit_logs ADD COLUMN actor_email TEXT", (err) => {
                    if (!err) {
                        console.log("Added actor_email column to audit_logs table");

                        // DATA MIGRATION: Backfill actor_email
                        // 1. From Admins
                        db.run(`
                            UPDATE audit_logs 
                            SET actor_email = (SELECT email FROM admins WHERE admins.id = audit_logs.actor_id)
                            WHERE actor_role = 'Admin' AND actor_email IS NULL
                        `, (err) => {
                            if (!err && this.changes > 0) console.log("Backfilled actor_email for Admins in audit_logs");
                        });

                        // 2. From Staff
                        db.run(`
                            UPDATE audit_logs 
                            SET actor_email = (SELECT email FROM staff WHERE staff.id = audit_logs.actor_id)
                            WHERE (actor_role = 'Staff' OR actor_role = 'System') AND actor_email IS NULL
                        `, (err) => {
                            if (!err && this.changes > 0) console.log("Backfilled actor_email for Staff in audit_logs");
                        });

                        // 3. For System Actions (if actor_id is SYSTEM)
                        db.run(`
                            UPDATE audit_logs 
                            SET actor_email = 'system@library.com'
                            WHERE actor_id = 'SYSTEM' AND actor_email IS NULL
                        `, (err) => {
                            if (!err && this.changes > 0) console.log("Backfilled actor_email for SYSTEM actions");
                        });
                    }
                });
            }
        });
    }
});

function initializeTables() {
    db.serialize(() => {

        // 5.8 departments (Created first as it's a dependency)
        db.run(`CREATE TABLE IF NOT EXISTS departments (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            code TEXT UNIQUE NOT NULL,
            description TEXT,
            hod_signature TEXT,
            created_at TEXT DEFAULT (datetime('now', '+05:30')),
            updated_at TEXT DEFAULT (datetime('now', '+05:30'))
        )`);

        // 5.1 students
        db.run(`CREATE TABLE IF NOT EXISTS students (
            id TEXT PRIMARY KEY,
            register_number TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            dept_id TEXT NOT NULL,
            semester TEXT,
            email TEXT,
            phone TEXT,
            dob TEXT NOT NULL,
            father_name TEXT,
            address TEXT,
            profile_image TEXT,
            status TEXT CHECK(status IN ('Active', 'Blocked', 'Alumni', 'Graduated', 'Deleted')),
            created_at TEXT DEFAULT (datetime('now', '+05:30')),
            updated_at TEXT DEFAULT (datetime('now', '+05:30')),
            FOREIGN KEY (dept_id) REFERENCES departments(id)
        )`);

        // 5.2 staff
        db.run(`CREATE TABLE IF NOT EXISTS staff (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            designation TEXT,
            access_permissions TEXT, -- JSON Array
            password_hash TEXT NOT NULL,
            status TEXT CHECK(status IN ('Active', 'Disabled', 'Deleted')),
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            last_login TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);

        // 5.3 admins
        db.run(`CREATE TABLE IF NOT EXISTS admins (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            password_hash TEXT NOT NULL,
            status TEXT CHECK(status IN ('Active', 'Disabled')),
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            last_login TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);

        // 5.4 books
        db.run(`CREATE TABLE IF NOT EXISTS books (
            id TEXT PRIMARY KEY,
            isbn TEXT UNIQUE,
            title TEXT NOT NULL,
            author TEXT NOT NULL,
            publisher TEXT,
            category TEXT,
            dept_id TEXT,
            cover_image TEXT,
            cover_image_url TEXT,
            price REAL,
            stock_total INTEGER DEFAULT 0,
            ebook_link TEXT,
            total_copies INTEGER DEFAULT 0,
            shelf_location TEXT,
            status TEXT CHECK(status IN ('Active', 'Deleted', 'Archived')) DEFAULT 'Active',
            created_at TEXT DEFAULT (datetime('now', '+05:30')),
            updated_at TEXT DEFAULT (datetime('now', '+05:30')),
            FOREIGN KEY (dept_id) REFERENCES departments(id)
        )`);

        // 5.5 book_copies
        db.run(`CREATE TABLE IF NOT EXISTS book_copies (
            id TEXT PRIMARY KEY,
            accession_number TEXT UNIQUE,
            book_id TEXT,
            book_isbn TEXT,
            status TEXT CHECK(status IN ('Available', 'Issued', 'Lost', 'Maintenance')),
            location TEXT,
            created_at TEXT DEFAULT (datetime('now', '+05:30')),
            updated_at TEXT DEFAULT (datetime('now', '+05:30')),
            FOREIGN KEY (book_id) REFERENCES books(id),
            FOREIGN KEY (book_isbn) REFERENCES books(isbn)
        )`);

        // 5.6 circulation (Active Loans)
        db.run(`CREATE TABLE IF NOT EXISTS circulation (
            id TEXT PRIMARY KEY,
            session_txn_id TEXT,
            student_id TEXT,
            copy_id TEXT,
            issued_by TEXT,
            issue_date TEXT,
            due_date TEXT,
            last_renewed_date TEXT,
            renewal_count INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(id),
            FOREIGN KEY (copy_id) REFERENCES book_copies(id)
        )`);

        // 5.7 transaction_logs (History/Ledger) - Decoupled
        db.run(`CREATE TABLE IF NOT EXISTS transaction_logs (
            id TEXT PRIMARY KEY,
            session_txn_id TEXT,
            action_type TEXT, -- ISSUE, RETURN, RENEW, LOST, DAMAGED
            student_id TEXT, -- Kept for reference, no FK constraint
            student_name TEXT, -- SNAPSHOT
            student_reg_no TEXT, -- SNAPSHOT
            student_dept TEXT, -- SNAPSHOT
            copy_id TEXT, -- Kept for reference, no FK constraint
            book_title TEXT, -- SNAPSHOT
            book_isbn TEXT, -- SNAPSHOT
            performed_by TEXT,
            timestamp TEXT DEFAULT (datetime('now', '+05:30')),
            details TEXT -- JSON for remarks, fine amounts, etc.
        )`);

        // 5.7 fines - Decoupled
        db.run(`CREATE TABLE IF NOT EXISTS fines (
            id TEXT PRIMARY KEY,
            receipt_number TEXT UNIQUE,
            transaction_id TEXT,
            student_id TEXT, -- No FK
            student_name TEXT, -- SNAPSHOT
            student_reg_no TEXT, -- SNAPSHOT
            amount REAL,
            status TEXT CHECK(status IN ('Unpaid', 'Paid', 'Waived')) DEFAULT 'Unpaid',
            is_paid INTEGER DEFAULT 0,
            payment_date TEXT,
            collected_by TEXT,
            remark TEXT,
            created_at TEXT DEFAULT (datetime('now', '+05:30')),
            updated_at TEXT DEFAULT (datetime('now', '+05:30')),
            FOREIGN KEY (transaction_id) REFERENCES transaction_logs(id)
        )`);

        // 5.9 broadcast_logs
        db.run(`CREATE TABLE IF NOT EXISTS broadcast_logs (
            id TEXT PRIMARY KEY,
            sender_id TEXT,
            sent_at TEXT,
            subject TEXT,
            message_body TEXT,
            target_group TEXT,
            recipient_count INTEGER,
            status TEXT CHECK(status IN ('Sent', 'Failed'))
        )`);

        // 5.10 audit_logs (Updated Schema)
        db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            timestamp TEXT DEFAULT (datetime('now', '+05:30')),
            actor_id TEXT,
            actor_role TEXT,
            actor_email TEXT, -- Added for better identification
            action_type TEXT,
            module TEXT,
            description TEXT,
            ip_address TEXT,
            metadata TEXT, -- JSON
            remark TEXT
        )`);

        // 5.11 email_config
        db.run(`CREATE TABLE IF NOT EXISTS email_config (
            id TEXT PRIMARY KEY,
            service_status INTEGER DEFAULT 0,
            provider TEXT,
            smtp_host TEXT,
            smtp_port INTEGER,
            smtp_secure INTEGER,
            smtp_user TEXT,
            smtp_pass TEXT,
            cloud_api_key TEXT,
            cloud_region TEXT,
            from_email TEXT,
            from_name TEXT,
            triggers TEXT, -- JSON
            updated_at TEXT DEFAULT (datetime('now', '+05:30'))
        )`);

        // 5.12 policy_config
        db.run(`CREATE TABLE IF NOT EXISTS policy_config (
            id TEXT PRIMARY KEY,
            policy_version INTEGER,
            active_from TEXT,
            profiles TEXT, -- JSON
            financials TEXT, -- JSON
            holidays TEXT, -- JSON
            security TEXT, -- JSON
            updated_at TEXT DEFAULT (datetime('now', '+05:30'))
        )`);

        // 5.13 sync_queue
        db.run(`CREATE TABLE IF NOT EXISTS sync_queue (
            id TEXT PRIMARY KEY,
            table_name TEXT NOT NULL,
            record_id TEXT NOT NULL,
            operation TEXT CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE')),
            data TEXT, -- JSON
            status TEXT CHECK(status IN ('pending', 'synced', 'failed')),
            created_at TEXT DEFAULT (datetime('now', '+05:30')),
            synced_at TEXT
        )`);

        // 5.14 system_settings (Updated with data_type column)
        db.run(`CREATE TABLE IF NOT EXISTS system_settings (
            id TEXT PRIMARY KEY,
            key TEXT UNIQUE NOT NULL,
            value TEXT,
            category TEXT,
            description TEXT,
            data_type TEXT DEFAULT 'string',
            is_user_editable INTEGER DEFAULT 1,
            requires_restart INTEGER DEFAULT 0,
            updated_by TEXT,
            updated_at TEXT DEFAULT (datetime('now', '+05:30'))
        )`);

        // 5.15 password_resets (NEW for Forgot Password)
        db.run(`CREATE TABLE IF NOT EXISTS password_resets (
            email TEXT PRIMARY KEY,
            otp TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now', '+05:30'))
        )`);


        console.log("Database tables initialized successfully.");

        // Migration: Add shelf_location column if missing
        db.run("ALTER TABLE books ADD COLUMN shelf_location TEXT", (err) => {
            if (!err) console.log("Migration: Added shelf_location column to books table.");
            // Ignore error if column already exists
        });


        // Seed Default Settings & System User (Admin is created via Setup Page)
        seedSystemSettings();
        ensureDefaultPolicies();
        seedSystemUser();
    });
}

function seedSystemUser() {
    db.get("SELECT count(*) as count FROM staff WHERE id = 'SYSTEM'", (err, row) => {
        if (!err && row && row.count === 0) {
            console.log("Seeding SYSTEM staff user...");
            const bcrypt = require('bcryptjs');
            const password = 'admin123';
            const saltRounds = 10;

            bcrypt.hash(password, saltRounds, (err, hash) => {
                if (err) {
                    console.error("Failed to hash SYSTEM password:", err);
                    return;
                }
                const insert = db.prepare("INSERT INTO staff (id, name, email, password_hash, status) VALUES (?, ?, ?, ?, ?)");
                insert.run('SYSTEM', 'System Administrator', 'system@library.com', hash, 'Active', (err) => {
                    if (err) console.error("Failed to insert SYSTEM user:", err);
                    else console.log("SYSTEM user seeded successfully with password 'admin123'.");
                });
                insert.finalize();
            });
        }
    });
}



function seedSystemSettings() {
    db.get("SELECT count(*) as count FROM system_settings", (err, row) => {
        if (row && row.count === 0) {
            console.log("Seeding default system settings (No .env)...");
            const insert = db.prepare("INSERT INTO system_settings (id, key, value, category, description) VALUES (?, ?, ?, ?, ?)");
            // Simple mock UUID for seed
            const newId = () => Math.random().toString(36).substr(2, 9);

            insert.run(newId(), 'server.port', '17221', 'network', 'Port for the internal API server');
            insert.run(newId(), 'app.header_title', 'GPTK Library', 'ui', 'Title in App Header');
            insert.run(newId(), 'circ.fine_per_day', '1.00', 'circulation', 'Fine per overdue day');
            insert.finalize();
        }
    });
}

function ensureDefaultPolicies() {
    const defaultPolicies = [
        {
            key: 'policy_borrowing', value: JSON.stringify({
                student: { maxBooks: 4, loanDays: 15, renewalDays: 15, maxRenewals: 1, blockFineThreshold: 100 },
                staff: { maxBooks: 10, loanDays: 30, renewalDays: 30, maxRenewals: 2, blockFineThreshold: 500 }
            }), category: 'Policy', description: 'Borrowing Rule Configuration', type: 'json'
        },
        { key: 'policy_financial', value: JSON.stringify({ dailyFineRate: 1.0, damagedFineAmount: 100, lostFineAmount: 500 }), category: 'Policy', description: 'Financial Configuration', type: 'json' },
        { key: 'policy_calendar', value: JSON.stringify({ weekends: ['Sunday'], holidays: [] }), category: 'Policy', description: 'Holiday Configuration', type: 'json' },
        { key: 'policy_version', value: '1.0', category: 'Policy', description: 'Current Policy Version', type: 'string' }
    ];

    const insert = db.prepare("INSERT INTO system_settings (id, key, value, category, description, data_type) VALUES (?, ?, ?, ?, ?, ?)");
    const check = db.prepare("SELECT id FROM system_settings WHERE key = ?");

    // Simple mock UUID
    const newId = () => Math.random().toString(36).substr(2, 9);

    db.serialize(() => {
        defaultPolicies.forEach(policy => {
            check.get(policy.key, (err, row) => {
                if (!err && !row) {
                    console.log(`[Seed] Adding missing policy: ${policy.key}`);
                    insert.run(newId(), policy.key, policy.value, policy.category, policy.description, policy.type);
                }
            });
        });
    });
}

// --- SMART BACKUP: Change Detection Hook ---
const changeDetection = require('./services/changeDetection');

// Regex to extract table name from INSERT/UPDATE/DELETE.
// Matches "INSERT INTO table", "UPDATE table", "DELETE FROM table" case insensitive
const TABLE_REGEX = /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+["`]?([a-zA-Z0-9_]+)["`]?/i;

const originalRun = db.run.bind(db);
const originalPrepare = db.prepare.bind(db);

// Override db.run
db.run = function (sql, ...params) {
    const match = sql.match(TABLE_REGEX);
    if (match && match[1]) {
        changeDetection.markDirty(match[1]);
    }
    return originalRun(sql, ...params);
};

// Override db.prepare for statements
db.prepare = function (sql, ...params) {
    const match = sql.match(TABLE_REGEX);
    // If it's a write operation, we wrap the statement's run method
    const stmt = originalPrepare(sql, ...params);

    if (match && match[1]) {
        const tableName = match[1];
        const originalStmtRun = stmt.run.bind(stmt);

        stmt.run = function (...runParams) {
            changeDetection.markDirty(tableName);
            return originalStmtRun(...runParams);
        };
    }
    return stmt;
};

module.exports = db;
