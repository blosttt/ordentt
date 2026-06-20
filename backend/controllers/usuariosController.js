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
        
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { id: usuario._id, carnet: usuario.carnet, rol: usuario.rol },
            process.env.JWT_SECRET || 'secret_ordent_tracker_key_2026',
            { expiresIn: '2h' } // Sesión expira tras 2 horas de inactividad / tiempo absoluto
        );
        
        res.json({ mensaje: 'Login exitoso', usuario, token });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
    }
};

exports.recoverPassword = async (req, res) => {
    try {
        const { carnet } = req.body;
        const usuario = await Usuario.findOne({ carnet });
        
        if (!usuario) {
            return res.status(404).json({ mensaje: 'No existe una cuenta con este carnet' });
        }
        
        const nuevaPassword = 'ordent' + carnet;
        usuario.password = nuevaPassword;
        await usuario.save();
        
        await Log.create({
            usuario: usuario.nombre || carnet,
            accion: 'RECUPERAR_PASSWORD',
            descripcion: `El usuario ${carnet} solicitó recuperación de contraseña. Se asignó clave temporal.`
        });
        
        res.json({ mensaje: `Tu nueva contraseña temporal es: ${nuevaPassword}` });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al recuperar contraseña', error: error.message });
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
        
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { id: nuevoUsuario._id, carnet: nuevoUsuario.carnet, rol: nuevoUsuario.rol },
            process.env.JWT_SECRET || 'secret_ordent_tracker_key_2026',
            { expiresIn: '2h' }
        );

        res.status(201).json({ mensaje: 'Usuario registrado', usuario: nuevoUsuario, token });
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
