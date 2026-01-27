const express = require('express');
const cors = require('cors');
const http = require('http'); // Import HTTP
const db = require('./db');
const authRoutes = require('./routes/authRoutes');
const socketService = require('./services/socketService'); // Import Socket Service

const app = express();
const server = http.createServer(app); // Create HTTP Server
const PORT = 3001; // Default port, eventually load from DB

// Init Cron Service
require('./services/cronService').init();
const changeDetection = require('./services/changeDetection');

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased limit for Base64 image uploads

// Smart Backup Middleware: Mark DB as dirty on write operations
app.use((req, res, next) => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        changeDetection.markDirty();
    }
    next();
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/books', require('./routes/bookRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/admins', require('./routes/adminRoutes'));
app.use('/api/staff', require('./routes/staffRoutes'));
app.use('/api/circulation', require('./routes/circulationRoutes'));
app.use('/api/policy', require('./routes/policyRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/health', require('./routes/healthRoutes'));
app.use('/api/fines', require('./routes/fineRoutes'));
app.use('/api/reports', require('./routes/reportsRoutes'));
app.use('/api/audit', require('./routes/auditRoutes'));
app.use('/api/db', require('./routes/dbRoutes'));

// API: Get Status
app.get('/api/status', (req, res) => {
    res.json({ status: 'online', db: 'connected' });
});

// --- Basic Settings Endpoint (Read-Only Public for now) ---
app.get('/api/settings', (req, res) => {
    db.all("SELECT key, value, category, description FROM system_settings", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ data: rows });
    });
});


// Init Socket.io
socketService.init(server);

server.listen(PORT, () => {
    console.log(`backend Server running on http://localhost:${PORT}`);
});

// Graceful Shutdown
// Graceful Shutdown
async function shutdown() {
    console.log("Stopping backend Server...");

    // Check for "on_close" backup
    const cloudBackupService = require('./services/cloudBackupService');

    try {
        const shouldBackup = await new Promise((resolve) => {
            db.get("SELECT value FROM system_settings WHERE key = 'backup_config'", (err, row) => {
                if (!err && row) {
                    try {
                        const config = JSON.parse(row.value);
                        if (config.autoBackup && config.frequency === 'on_close' && config.connectionUri) {
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    } catch (e) { resolve(false); }
                } else {
                    resolve(false);
                }
            });
        });

        if (shouldBackup) {
            if (changeDetection.isDirty()) {
                console.log('[Shutdown] "Every Time App Closes" backup active. performing backup...');
                const result = await cloudBackupService.performCloudBackup();
                console.log('[Shutdown] Backup result:', result.success ? 'Success' : 'Failed');
            } else {
                console.log('[Shutdown] Smart Backup: No changes detected. Skipping backup.');
            }
        }
    } catch (err) {
        console.error('[Shutdown] Backup error:', err);
    }

    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown); // Handle Ctrl+C locally too

// Handle IPC shutdown message from Electron (Windows friendly)
process.on('message', (msg) => {
    if (msg === 'shutdown') {
        console.log("Received IPC shutdown signal from Electron");
        shutdown();
    }
});


