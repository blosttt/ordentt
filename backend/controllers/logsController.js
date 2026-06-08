const Log = require('../models/Log');

exports.getLogs = async (req, res) => {
    try {
        const logs = await Log.find().sort({ createdAt: -1 }).limit(100);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener logs', error: error.message });
    }
};

exports.createLog = async (req, res) => {
    try {
        const { usuario, accion, descripcion } = req.body;
        const newLog = await Log.create({ usuario, accion, descripcion });
        res.status(201).json(newLog);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al crear log', error: error.message });
    }
};
