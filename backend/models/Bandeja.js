const mongoose = require('mongoose');

const bandejaSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    ubicacion: {
        type: String,
        enum: ['central_esterilizacion', 'locker_universidad', 'cajon'],
        required: true
    },
    insumos: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Insumo'
    }],
    estado: {
        type: String,
        enum: ['vacía', 'en_proceso', 'completa', 'esterilizada'],
        default: 'vacía'
    }
});

module.exports = mongoose.model('Bandeja', bandejaSchema);