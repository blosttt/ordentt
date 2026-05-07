const express = require('express');
const router = express.Router();
const cajasController = require('../controllers/cajasController');

router.get('/', cajasController.getCajas);
router.post('/', cajasController.crearCaja);
router.put('/:id', cajasController.actualizarCaja);
router.delete('/:id', cajasController.eliminarCaja);

module.exports = router;
