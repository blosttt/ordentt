const mongoose = require('mongoose');

const historialSchema = new mongoose.Schema({
    fecha: { type: Date, default: Date.now },
    accion: { type: String, required: true },
    nota: { type: String }
});

const insumoSchema = new mongoose.Schema({
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    nombre: { type: String, required: true },
    codigo: { type: String, required: true },
    tipo: { type: String, required: true },
    cantidad: { type: Number, required: true, default: 1 },
    esterilizado: { type: Boolean, default: false },
    ubicacionActual: { 
        type: String, 
        default: 'mis_cosas',
        required: true 
    },
    fechaEnvioEsterilizacion: { type: Date },
    fechaDevolucionEstimada: { type: Date },
    historial: [historialSchema]
}, { timestamps: true });

module.exports = mongoose.model('Insumo', insumoSchema);