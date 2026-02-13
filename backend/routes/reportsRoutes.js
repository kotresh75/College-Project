const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');

router.get('/circulation', reportsController.getCirculationStats);
router.get('/financial', reportsController.getFinancialStats);
router.get('/inventory', reportsController.getInventoryStats);
router.get('/summary', reportsController.getDailySummary);

module.exports = router;
