const Solicitud = require('../models/Solicitud');

exports.getSolicitudes = async (req, res) => {
    try {
        const solicitudes = await Solicitud.find().populate('usuario', 'nombre carnet').sort({ fecha: -1 });
        res.json(solicitudes);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener solicitudes', error: error.message });
    }
};

exports.crearSolicitud = async (req, res) => {
    try {
        const { consecutivo, estado, insumoId, insumoNombre, insumoCodigo, usuario, devolucionEstimada, nota, cantidad } = req.body;
        
        const nuevaSolicitud = new Solicitud({
            consecutivo, estado, insumoId, insumoNombre, insumoCodigo,
            usuario, devolucionEstimada, nota, cantidad: cantidad || 1
        });
        
        await nuevaSolicitud.save();
        res.status(201).json({ mensaje: 'Solicitud creada', solicitud: nuevaSolicitud });
    } catch (error) {
        res.status(400).json({ mensaje: 'Error al crear solicitud', error: error.message });
    }
};

exports.actualizarEstadoSolicitud = async (req, res) => {
    try {
        const { consecutivo } = req.params;
        const { estado, fechaRecepcion, fechaCaducidad } = req.body;
        
        const solicitud = await Solicitud.findOne({ consecutivo });
        if (!solicitud) return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
        
        if (estado) solicitud.estado = estado;
        if (fechaRecepcion) solicitud.fechaRecepcion = fechaRecepcion;
        if (fechaCaducidad) solicitud.fechaCaducidad = fechaCaducidad;
        
        await solicitud.save();
        res.json({ mensaje: 'Estado de solicitud actualizado', solicitud });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al actualizar solicitud', error: error.message });
    }
};
