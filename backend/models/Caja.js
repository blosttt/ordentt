const mongoose = require('mongoose');

const cajaSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    slug: { type: String, required: true },
    fija: { type: Boolean, default: false },
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true }
}, { timestamps: true });

// Índice compuesto para que un usuario no pueda tener dos cajas con el mismo slug
cajaSchema.index({ usuarioId: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('Caja', cajaSchema);
