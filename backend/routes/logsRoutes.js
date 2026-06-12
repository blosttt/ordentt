const express = require('express');
const router = express.Router();
const logsController = require('../controllers/logsController');

router.get('/', logsController.getLogs);
router.post('/', logsController.createLog);
router.delete('/', logsController.clearLogs);

module.exports = router;
