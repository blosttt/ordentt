const express = require('express');
const router = express.Router();
const logsController = require('../controllers/logsController');

router.get('/', logsController.getLogs);
router.post('/', logsController.createLog);

module.exports = router;
