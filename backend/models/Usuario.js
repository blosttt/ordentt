const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    carnet: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    rol: { type: String, default: 'usuario', enum: ['usuario', 'admin'] },
}, { timestamps: true });

module.exports = mongoose.model('Usuario', usuarioSchema);
