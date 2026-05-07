const mongoose = require('mongoose');

const plantillaSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    implementos: [{
        nombre: { type: String, required: true },
        cantidad: { type: Number, required: true, default: 1 }
    }],
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Plantilla', plantillaSchema);
