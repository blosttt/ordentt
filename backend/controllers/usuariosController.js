const Usuario = require('../models/Usuario');

exports.login = async (req, res) => {
    try {
        const { carnet, password } = req.body;
        const usuario = await Usuario.findOne({ carnet, password });
        
        if (!usuario) {
            return res.status(401).json({ mensaje: 'Credenciales inválidas' });
        }
        
        res.json({ mensaje: 'Login exitoso', usuario });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
    }
};

exports.register = async (req, res) => {
    try {
        const { nombre, carnet, password } = req.body;
        
        // Verificar si existe
        const existente = await Usuario.findOne({ carnet });
        if (existente) {
            return res.status(400).json({ mensaje: 'El carnet ya está registrado' });
        }
        
        const nuevoUsuario = new Usuario({ nombre, carnet, password });
        await nuevoUsuario.save();
        
        res.status(201).json({ mensaje: 'Usuario registrado', usuario: nuevoUsuario });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al registrar', error: error.message });
    }
};

exports.getUsuarios = async (req, res) => {
    try {
        const usuarios = await Usuario.find({}, '-password');
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener usuarios', error: error.message });
    }
};
