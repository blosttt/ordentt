const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');

router.post('/login', usuariosController.login);
router.post('/register', usuariosController.register);
router.get('/', usuariosController.getUsuarios);

module.exports = router;
