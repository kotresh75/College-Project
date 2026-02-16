const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// DB is in root/DB/lms.sqlite
const dbPath = path.join(__dirname, '..', 'DB', 'lms.sqlite');
console.log('Checking DB at:', dbPath);

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.all("SELECT * FROM departments", (err, rows) => {
        if (err) console.error('Error fetching depts:', err);
        else {
            console.log('Departments count:', rows.length);
            console.log('Departments:', rows);
        }
    });
});

db.close();
