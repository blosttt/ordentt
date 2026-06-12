const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/login', usuariosController.login);
router.post('/register', usuariosController.register);

// Rutas protegidas
router.get('/', authMiddleware, usuariosController.getUsuarios);
router.put('/:id', authMiddleware, usuariosController.updateUsuario);
router.delete('/:id', authMiddleware, usuariosController.deleteUsuario);

module.exports = router;
