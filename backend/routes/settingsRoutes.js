const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsHandler');

router.get('/app', settingsController.getAppSettings);
router.put('/app', settingsController.updateAppSettings);
router.post('/change-password', settingsController.changeUserPassword);
router.get('/email/usage', settingsController.getEmailUsage);
router.post('/test-email', settingsController.testEmail);
router.post('/cloud/test-connection', settingsController.testCloudConnection);
router.post('/cloud/backup', settingsController.triggerCloudBackup);
router.post('/cloud/restore', settingsController.triggerCloudRestore);
router.post('/backup/create', settingsController.createLocalBackup);
router.post('/factory-reset', settingsController.factoryReset);

// Principal Signature routes
router.get('/principal-signature', settingsController.getPrincipalSignature);
router.post('/principal-signature', settingsController.uploadPrincipalSignature);
router.delete('/principal-signature', settingsController.deletePrincipalSignature);

module.exports = router;
