const express = require('express');
const cors = require('cors');
const http = require('http'); // Import HTTP
const db = require('./db');
const authRoutes = require('./routes/authRoutes');
const socketService = require('./services/socketService'); // Import Socket Service

const app = express();
const server = http.createServer(app); // Create HTTP Server
const PORT = 17221; // Default port, eventually load from DB

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

// Global Error Handler (Prevents HTML errors leaking to API clients)
app.use((err, req, res, next) => {
    console.error("Unhandled Backend Error:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
});


// Init Socket.io
socketService.init(server);

server.listen(PORT, () => {
    console.log(`backend Server running on http://localhost:${PORT}`);
});

// Graceful Shutdown
// Graceful Shutdown
// Graceful Shutdown & Backup Logic
async function performShutdownSequence() {
    console.log("[Backend] Starting shutdown sequence...");

    // Check for "on_close" backup
    const cloudBackupService = require('./services/cloudBackupService');

    // Define backupStatus here so it is accessible in db.close callback
    let backupStatus = { performed: false, success: false, message: '' };

    try {
        // 1. Check Settings for Backup on Close
        const shouldBackup = await new Promise((resolve) => {
            db.get("SELECT value FROM system_settings WHERE key = 'backup_config'", (err, row) => {
                if (!err && row) {
                    try {
                        const config = JSON.parse(row.value);
                        // Check if enabled AND freq is 'on_close' AND we have connection URI
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

        // 2. Perform Backup if needed
        if (shouldBackup) {
            // We can also check changeDetection.isDirty() if we want optimization,
            // but user explicitly asked for "backup when app closed", implying a forceful backup check is good.
            // Let's stick to dirty check to save bandwidth if nothing changed.
            if (changeDetection.isDirty()) {
                console.log('[Shutdown] "Backup on Close" active. Performing backup...');
                const result = await cloudBackupService.performCloudBackup();
                console.log('[Shutdown] Backup result:', result.success ? 'Success' : 'Failed');

                backupStatus = {
                    performed: true,
                    success: result.success,
                    message: result.error || (result.success ? "Backup completed successfully." : "Backup failed.")
                };
            } else {
                console.log('[Shutdown] Smart Backup: No changes detected. Skipping backup.');
            }
        }
    } catch (err) {
        console.error('[Shutdown] Backup error:', err);
        // If an error occurred, force the UI to show it
        backupStatus = {
            performed: true,
            success: false,
            message: "Backup failed: " + (err.message || "Unknown error")
        };
    }

    // 3. Close DB
    db.close((err) => {
        if (err) console.error('Error closing database:', err.message);
        else console.log('Database connection closed.');

        // 4. Notify Main Process we are done
        // Since we are in the same process as Main (require-d), we use process.emit
        console.log("[Backend] Shutdown complete. Emitting completion signal.");
        process.emit('backend-exit-completed', backupStatus);
    });
}

// Listen for signal from Main Process
process.on('graceful-exit-request', () => {
    console.log("[Backend] Received graceful exit request.");
    performShutdownSequence();
});

// Keep generic listeners for dev/standalone safety
process.on('SIGTERM', () => { process.emit('backend-exit-completed'); });
process.on('SIGINT', () => { process.emit('backend-exit-completed'); });

// Legacy IPC (can remove if we are sure 'graceful-exit-request' covers it)
process.on('message', (msg) => {
    if (msg === 'shutdown') {
        performShutdownSequence();
    }
});


