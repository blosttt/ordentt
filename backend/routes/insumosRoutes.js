const express = require('express');
const router = express.Router();
const insumosController = require('../controllers/insumosController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', insumosController.getInventario);
router.get('/global', insumosController.getInsumosGlobales);
router.post('/', insumosController.crearInsumo); // Ahora el create ya no toma /:ubicacion, siempre va a mis_cosas
router.delete('/:id', insumosController.eliminarInsumo);
router.put('/mover/:id', insumosController.moverInsumo);
router.put('/:id', insumosController.actualizarInsumo);
router.post('/enviar-esterilizacion/:id', insumosController.enviarEsterilizar);
router.put('/recibir-esterilizado/:id', insumosController.recibirEsterilizado);
router.post('/parse-pdf', upload.single('pdf'), insumosController.parsePdf);

module.exports = router;
