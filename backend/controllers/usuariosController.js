const Usuario = require('../models/Usuario');
const Log = require('../models/Log');

exports.login = async (req, res) => {
    try {
        const { carnet, password } = req.body;
        const usuario = await Usuario.findOne({ carnet, password });
        
        if (!usuario) {
            return res.status(401).json({ mensaje: 'Credenciales inválidas' });
        }
        
        await Log.create({
            usuario: usuario.nombre || carnet,
            accion: 'LOGIN',
            descripcion: `El usuario ${carnet} inició sesión en el sistema.`
        });
        
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
        
        const rol = (carnet === 'admin') ? 'admin' : 'usuario';
        const nuevoUsuario = new Usuario({ nombre, carnet, password, rol });
        await nuevoUsuario.save();
        
        await Log.create({
            usuario: nombre || carnet,
            accion: 'REGISTRO',
            descripcion: `Se registró un nuevo usuario: ${carnet} con rol ${rol}.`
        });
        
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
