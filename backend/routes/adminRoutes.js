const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer for Attachments
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            const uploadDir = path.join(__dirname, '../uploads/temp');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        } catch (e) {
            console.error("Multer Destination Error:", e);
            cb(e);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB Limit
});

// Middleware (Authenticated Admins Only)
const { verifyAdmin } = require('../middleware/authMiddleware');
router.use(verifyAdmin);

router.get('/', adminController.getAdmins);
router.post('/', adminController.createAdmin);
router.put('/:id', adminController.updateAdmin);
router.patch('/:id/status', adminController.toggleStatus);
router.post('/:id/reset-password', adminController.resetPassword);
router.delete('/:id', adminController.deleteAdmin);
router.get('/:id/logs', adminController.getAdminLogs);
router.get('/broadcast/history', adminController.getBroadcastHistory);
router.post('/broadcast', upload.single('attachment'), adminController.broadcastMessage);

module.exports = router;
