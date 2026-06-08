const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    usuario: { type: String, required: true }, // Carnet o nombre del usuario
    accion: { type: String, required: true }, // Ej: LOGIN, CREAR_INSUMO, MOVER_INSUMO
    descripcion: { type: String, required: true }, // Detalle de la acción
    ip: { type: String, default: 'Desconocida' }, // Opcional, si queremos loggear IP
}, { timestamps: true });

module.exports = mongoose.model('Log', logSchema);
