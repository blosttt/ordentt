const express = require('express');
const router = express.Router();
const clinicasController = require('../controllers/clinicasController');

router.get('/', clinicasController.getClinicas);
router.post('/', clinicasController.crearClinica);
router.delete('/:id', clinicasController.eliminarClinica);

// Ojo con el orden de las rutas para evitar choques con :id
router.get('/activa', clinicasController.getClinicaActiva);
router.put('/:id/toggle', clinicasController.toggleClinica);

module.exports = router;
