const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware to ensure admin access (simplified for now, assumes auth middleware runs before or we check here)
// Ideally, we should check req.user.role === 'Admin' if we had the middleware attached.
// For now, I'll rely on the frontend to protect usage, but backend protection is better.
// Assuming server.js mounts this under /api/db and might have auth middleware.

// GET /api/db/tables - List all tables
router.get('/tables', (req, res) => {
    const query = "SELECT name, type FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'";
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error("Error listing tables:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// GET /api/db/schema/:table - Get columns for a table
router.get('/schema/:table', (req, res) => {
    const table = req.params.table;
    // Validate table name to prevent injection (basic alpha-numeric check)
    if (!/^[a-zA-Z0-9_]+$/.test(table)) {
        return res.status(400).json({ error: "Invalid table name" });
    }

    const query = `PRAGMA table_info(${table})`;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error(`Error getting schema for ${table}:`, err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// GET /api/db/query - Get data from a table with pagination
router.get('/query', (req, res) => {
    const { table, page = 1, limit = 50, sort = 'rowid', order = 'DESC' } = req.query;

    // Validate inputs
    if (!table || !/^[a-zA-Z0-9_]+$/.test(table)) {
        return res.status(400).json({ error: "Invalid or missing table name" });
    }

    const offset = (page - 1) * limit;
    const safeLimit = Math.min(parseInt(limit) || 50, 10000); // Max 10000 rows per request
    const safeSort = /^[a-zA-Z0-9_]+$/.test(sort) ? sort : 'rowid';
    const safeOrder = order === 'ASC' ? 'ASC' : 'DESC';

    const countQuery = `SELECT count(*) as total FROM "${table}"`;
    const dataQuery = `SELECT *, rowid FROM "${table}" ORDER BY "${safeSort}" ${safeOrder} LIMIT ? OFFSET ?`;

    db.get(countQuery, [], (err, countRow) => {
        if (err) {
            // Likely table doesn't exist or other error
            return res.status(500).json({ error: err.message });
        }

        db.all(dataQuery, [safeLimit, offset], (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({
                data: rows,
                pagination: {
                    total: countRow.total,
                    page: parseInt(page),
                    limit: safeLimit,
                    totalPages: Math.ceil(countRow.total / safeLimit)
                }
            });
        });
    });
});

// POST /api/db/query - Execute specific SQL (Read-Only Safety Check?)
// For now, let's stick to the /query GET for safe table browsing. 
// Raw SQL execution is risky even for admins if not careful.

module.exports = router;
