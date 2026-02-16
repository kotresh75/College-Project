const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

const { verifyToken } = require('../middleware/authMiddleware');

// Public setup routes (no auth required)
router.get('/setup-status', authController.setupStatus);
router.post('/setup', authController.setupAdmin);

router.post('/login', authController.login);
router.post('/forgot-password', authController.requestPasswordReset);
router.post('/verify-otp', authController.verifyOTP);
router.post('/reset-password', authController.resetPassword);
router.post('/change-password', verifyToken, authController.changePassword);
router.put('/profile-icon', verifyToken, authController.updateProfileIcon);

module.exports = router;
