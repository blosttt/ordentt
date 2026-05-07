const express = require('express');
const router = express.Router();
const plantillasController = require('../controllers/plantillasController');

router.get('/', plantillasController.getPlantillas);
router.post('/', plantillasController.crearPlantilla);
router.put('/:id', plantillasController.actualizarPlantilla);
router.delete('/:id', plantillasController.eliminarPlantilla);

module.exports = router;
