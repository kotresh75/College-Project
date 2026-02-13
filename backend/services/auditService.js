const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const socketService = require('./socketService');


/**
 * Centalized Log Audit Function
 * @param {Object|string} user - The user object from req.user (or actorId string if system)
 * @param {string} actionType - CREATE, UPDATE, DELETE, ISSUE, RETURN, LOGIN, etc.
 * @param {string} moduleName - Auth, Books, Circulation, Students, Settings, etc.
 * @param {string} description - Human readable description
 * @param {Object} metadata - Optional JSON metadata
 */
exports.log = (user, actionType, moduleName, description, metadata = {}) => {
    return new Promise((resolve, reject) => {
        try {
            const id = uuidv4();
            let actorId = 'SYSTEM';
            let actorRole = 'System';
            let actorEmail = 'system@library.com';
            let ipAddress = null;

            if (user && typeof user === 'object') {
                actorId = user.id || 'SYSTEM';
                actorRole = user.role || 'System';
                actorEmail = user.email || null;
                // If we passed req.user from auth middleware, it might have more info, 
                // but we stick to ID/Role for the DB schema.
            } else if (typeof user === 'string') {
                actorId = user; // Manual override
                // If manual string id provided, we might not know email, leave null or lookup later (too expensive here)
                if (actorId === 'SYSTEM') actorEmail = 'system@library.com';
            }

            // Extract IP if metadata has it (optional convention)
            if (metadata && metadata.ip) {
                ipAddress = metadata.ip;
                delete metadata.ip; // Remove from metadata after extracting
            }

            const query = `
                INSERT INTO audit_logs 
                (id, actor_id, actor_role, actor_email, action_type, module, description, metadata, ip_address, timestamp) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+05:30'))
            `;

            const params = [
                id,
                actorId,
                actorRole,
                actorEmail,
                actionType,
                moduleName,
                description,
                JSON.stringify(metadata),
                ipAddress
            ];

            db.run(query, params, (err) => {
                if (err) {
                    console.error("AuditService Error:", err);
                    // We typically resolve anyway so as not to block the main flow
                    resolve(null);
                } else {
                    socketService.emit('audit_log', {
                        id, actorId, actorRole, actorEmail, actionType, moduleName, description, metadata, ipAddress, timestamp: new Date().toISOString()
                    });
                    resolve(id);
                }
            });

        } catch (e) {
            console.error("AuditService Exception:", e);
            resolve(null);
        }
    });
};
