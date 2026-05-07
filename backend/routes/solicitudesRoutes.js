const express = require('express');
const router = express.Router();
const solicitudesController = require('../controllers/solicitudesController');

router.get('/', solicitudesController.getSolicitudes);
router.post('/', solicitudesController.crearSolicitud);
router.put('/:consecutivo', solicitudesController.actualizarEstadoSolicitud);

module.exports = router;
