const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV !== 'production';
const userDataPath = isDev
    ? path.resolve(__dirname, '../..')
    : path.join(process.env.APPDATA || process.env.HOME, 'GPTK Library Manager');

// Check likely paths
const pathsToCheck = [
    path.join(userDataPath, 'DB', 'lms.sqlite'),
    path.resolve(__dirname, '../../DB/lms.sqlite'),
    path.join(process.env.APPDATA || '', 'GPTK Library Manager', 'DB', 'lms.sqlite'),
    path.join(process.env.APPDATA || '', 'gptk-library-management-system', 'DB', 'lms.sqlite'),
    path.join(process.env.APPDATA || '', 'Electron', 'DB', 'lms.sqlite')
];

// Deduplicate paths
const uniquePaths = [...new Set(pathsToCheck.map(p => p.toLowerCase()))];
const foundPaths = uniquePaths.filter(p => fs.existsSync(p));

if (foundPaths.length === 0) {
    console.error("Database file not found in any of the expected locations:");
    uniquePaths.forEach(p => console.error(` - ${p}`));
    process.exit(1);
}

console.log(`Found ${foundPaths.length} database(s) to check:`);
foundPaths.forEach(p => console.log(` - ${p}`));

async function migrateDB(targetDbPath) {
    console.log(`\nProcessing database: ${targetDbPath}`);
    const db = new sqlite3.Database(targetDbPath, (err) => {
        if (err) {
            console.error(`Could not connect to database at ${targetDbPath}`, err);
            return;
        }
    });

    const run = (sql, params = []) => new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });

    const all = (sql, params = []) => new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });

    try {
        const tables = await all("SELECT name FROM sqlite_master WHERE type='table'");
        const tableNames = tables.map(t => t.name);

        if (tableNames.includes('students_new') && !tableNames.includes('students')) {
            console.log("Recovery Mode: Found 'students_new' but no 'students'.");
            const columnsNew = await all("PRAGMA table_info(students_new)");
            const emailCol = columnsNew.find(c => c.name === 'email');

            if (emailCol && emailCol.notnull === 0) {
                console.log("students_new has correct schema. Renaming to students...");
                await run("ALTER TABLE students_new RENAME TO students");
                console.log("Recovery Successful: Renamed students_new to students.");
                return;
            } else {
                console.error("students_new exists but schema is wrong (email might be NOT NULL).");
                throw new Error("students_new exists but schema is incorrect.");
            }
        }

        if (!tableNames.includes('students')) {
            console.log("No students table found. Skipping.");
            return;
        }

        const columns = await all("PRAGMA table_info(students)");
        const emailCol = columns.find(c => c.name === 'email');
        if (!emailCol) throw new Error("Email column not found");

        if (emailCol.notnull === 0) {
            console.log("Email is already nullable. No migration needed.");
        } else {
            console.log("Migration: Removing NOT NULL constraint from students.email...");

            await run("PRAGMA foreign_keys=OFF");
            await run("BEGIN TRANSACTION");

            await run("DROP TABLE IF EXISTS students_new");

            await run(`CREATE TABLE students_new (
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

            await run(`INSERT INTO students_new (
                id, register_number, full_name, dept_id, semester, email, phone, dob, father_name, address, profile_image, status, created_at, updated_at
            ) SELECT 
                id, register_number, full_name, dept_id, semester, email, phone, dob, father_name, address, profile_image, status, created_at, updated_at 
            FROM students`);

            await run("DROP TABLE students");
            await run("ALTER TABLE students_new RENAME TO students");
            await run("COMMIT");
            console.log("Migration Successful: students.email is now nullable.");
        }

    } catch (e) {
        console.error(`Migration Failed for ${targetDbPath}:`, e);
        try { await run("ROLLBACK"); } catch (rollbackErr) { }
    } finally {
        try {
            await run("PRAGMA foreign_keys=ON");
            db.close();
        } catch (closeErr) {
            console.error("Error closing DB:", closeErr);
        }
    }
}

async function migrateAll() {
    for (const p of foundPaths) {
        await migrateDB(p);
    }
}

migrateAll();
