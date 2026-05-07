const express = require('express');
const router = express.Router();
const insumosController = require('../controllers/insumosController');

router.get('/', insumosController.getInventario);
router.post('/', insumosController.crearInsumo); // Ahora el create ya no toma /:ubicacion, siempre va a mis_cosas
router.delete('/:id', insumosController.eliminarInsumo);
router.put('/mover/:id', insumosController.moverInsumo);
router.put('/:id', insumosController.actualizarInsumo);
router.post('/enviar-esterilizacion/:id', insumosController.enviarEsterilizar);
router.put('/recibir-esterilizado/:id', insumosController.recibirEsterilizado);

module.exports = router;
