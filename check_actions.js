const db = require('./backend/db');

db.all("SELECT DISTINCT action_type FROM audit_logs", [], (err, rows) => {
    if (err) {
        console.error("Error:", err);
    } else {
        console.log("Unique Action Types:", rows.map(r => r.action_type));
    }
});
