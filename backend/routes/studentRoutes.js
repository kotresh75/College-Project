const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

router.get('/', studentController.getStudents);
router.post('/', studentController.createStudent);
router.post('/bulk-import', studentController.bulkImport); // Place specific routes before :id
router.post('/bulk-delete', studentController.bulkDelete);
router.post('/bulk-update', studentController.bulkUpdate);
router.post('/bulk-promote', studentController.bulkPromote);
router.post('/bulk-demote', studentController.bulkDemote);
router.post('/export', studentController.exportStudents);
router.post('/promote', studentController.promoteStudents);
router.post('/promotion-scan', studentController.scanForPromotion);
router.post('/photo/upload', studentController.uploadPhoto);
router.get('/defaulters', studentController.getDefaulters);
router.get('/id-cards', studentController.getStudentsForIdCards);
router.put('/:id', studentController.updateStudent);
router.delete('/:id', studentController.deleteStudent);

router.post('/photo/bulk-delete', studentController.bulkDeletePhotos);
router.get('/photo/stats', studentController.getPhotoStats);

module.exports = router;
