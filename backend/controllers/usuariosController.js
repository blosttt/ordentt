const Usuario = require('../models/Usuario');
const Log = require('../models/Log');

exports.login = async (req, res) => {
    try {
        const { carnet, password } = req.body;
        const usuario = await Usuario.findOne({ carnet, password });
        
        if (!usuario) {
            return res.status(401).json({ mensaje: 'Credenciales erróneas' });
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

exports.updateUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, password, rol } = req.body;
        
        const usuario = await Usuario.findById(id);
        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        
        if (nombre) usuario.nombre = nombre;
        if (password) usuario.password = password;
        if (rol) usuario.rol = rol;
        
        await usuario.save();
        
        await Log.create({
            usuario: usuario.nombre || usuario.carnet,
            accion: 'ACTUALIZAR_PERFIL',
            descripcion: `Se actualizó el perfil del usuario ${usuario.carnet}.`
        });
        
        res.json({ mensaje: 'Usuario actualizado', usuario });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al actualizar usuario', error: error.message });
    }
};

exports.deleteUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const usuario = await Usuario.findByIdAndDelete(id);
        
        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        
        await Log.create({
            usuario: 'SISTEMA',
            accion: 'ELIMINAR_USUARIO',
            descripcion: `Se eliminó al usuario ${usuario.carnet}.`
        });
        
        res.json({ mensaje: 'Usuario eliminado exitosamente' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al eliminar usuario', error: error.message });
    }
};
