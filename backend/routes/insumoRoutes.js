const express = require('express');
const router = express.Router();
const {
    getInsumos,
    createInsumo,
    updateUbicacion,
    esterilizar
} = require('../controllers/insumoController');

router.get('/', getInsumos);
router.post('/', createInsumo);
router.put('/:id/ubicacion', updateUbicacion);
router.put('/:id/esterilizar', esterilizar);

module.exports = router;