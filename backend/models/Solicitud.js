const mongoose = require('mongoose');

const solicitudSchema = new mongoose.Schema({
    consecutivo: { type: String, required: true, unique: true },
    fecha: { type: Date, default: Date.now },
    estado: { 
        type: String, 
        enum: ['SOLICITADO', 'EN_ESTERILIZACION', 'ENTREGADO', 'CADUCADO'],
        default: 'SOLICITADO'
    },
    insumoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Insumo', required: true },
    insumoNombre: { type: String, required: true },
    insumoCodigo: { type: String, required: true },
    cantidad: { type: Number, required: true, default: 1 },
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    fechaRecepcion: { type: Date },
    devolucionEstimada: { type: Date },
    nota: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Solicitud', solicitudSchema);
